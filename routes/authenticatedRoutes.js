const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const User = require('../models/User');
const redisClient = require('../redisConn');

const generateQuestion = async (url, res, user, currentStreak, highestStreak, score, correctAnswers, wrongAnswers, saveNewQues, userRank) => {
    try {
        const response = await fetch(url)
        const data = await response.json();

        // if data.length true means new question is being generated so we should check first that new question generated is not attempted earlier by the user
        if (data.length) {
            // Check if user has already attempted this question
            const alreadyAttempted = user.questionsAttempted && user.questionsAttempted.some(
                attempt => attempt.questionId === data[0].id
            );
            if (alreadyAttempted) {
                // Fetch a new question if already attempted
                return generateQuestion(url, res, user, currentStreak, highestStreak, score, correctAnswers, wrongAnswers, saveNewQues, userRank);
            }
        }

        const d = data.length ? data[0] : data
        console.log("user: ", user);

        const options = [d.correctAnswer, ...d.incorrectAnswers];

        // Shuffle the options array
        for (let i = options.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [options[i], options[j]] = [options[j], options[i]];
        }

        if (saveNewQues) {
            user.questionsAttempted = user.questionsAttempted || [];
            user.questionsAttempted.push({
                questionId: d.id,
                attemptedAt: null
            });
            await user.save();
        }
        return res.status(200).json({ question: d.question, options, username: user.username, currentStreak, highestStreak, score, correctAnswers, wrongAnswers, rank: userRank });
    } catch (e) {
        console.log(e);

        return res.status(500).json({ error: "Question cannot be fetched." })
    }
}

router.get('/question', verifyToken, async (req, res) => {
    try {
        // first check if a user has a question saved in db but attempt pending
        const userId = req.userId;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // calculate the highest and current correct answer streak
        let highestStreak = 0;
        let currentStreak = 0;
        let tempStreak = 0;
        let score = 0
        let correctAnswers = 0
        let wrongAnswers = 0

        // get the rank of the user 
        // Step 1: Fetch full sorted list from Redis
        const raw = await redisClient.zRangeWithScores("leaderboard", 0, -1, { REV: true });

        // Step 2: Assign same-rank based on score
        let lastScore = null;
        let currentRank = 0;
        let actualRank = 0;
        let userRank = null;
        let userScore = null;

        for (const entry of raw) {
            const score = entry.score;
            const name = entry.value;

            actualRank++;

            if (score !== lastScore) {
                currentRank = actualRank;
                lastScore = score;
            }

            if (name === user.username) {
                userRank = currentRank;
                userScore = score;
                break; // Stop once found
            }
        }

        if (user.questionsAttempted && user.questionsAttempted.length > 0) {
            // Sort attempts by attemptedAt date ascending
            const sortedAttempts = user.questionsAttempted
                .filter(a => a.attemptedAt)

            sortedAttempts.forEach(attempt => {
                if (attempt.isCorrect) {
                    tempStreak += 1;
                    score += 10;
                    correctAnswers += 1
                    if (tempStreak > highestStreak) highestStreak = tempStreak;
                } else {
                    wrongAnswers += 1
                    tempStreak = 0;
                }
            });

            // Current streak is the streak at the end of the array (most recent attempts)
            currentStreak = tempStreak;
        }

        // Check if user has a pending question (not attempted yet)
        const pendingAttempt = user.questionsAttempted && user.questionsAttempted.find(
            attempt => attempt.attemptedAt === null
        );
        if (pendingAttempt) {
            return generateQuestion('https://the-trivia-api.com/api/question/' + pendingAttempt.questionId, res, user, currentStreak, highestStreak, score, correctAnswers, wrongAnswers, userRank)
        }

        // check if the user has attempted a question 6 hrs ago
        const currentTime = new Date();
        const sixHoursAgo = new Date(currentTime.getTime() - 6 * 60 * 60 * 1000);

        // check if a question was attempted in the last 6 hours
        let questionAttemptedIn6Hrs = false;
        console.log(user);

        user.questionsAttempted ? user.questionsAttempted.forEach(attempt => {
            if (new Date(attempt.attemptedAt) > sixHoursAgo) {
                questionAttemptedIn6Hrs = attempt;
            }
            return attempt
        }) : ""

        // user.highestStreak = highestStreak;
        // user.currentStreak = currentStreak;
        // await user.save();

        if (questionAttemptedIn6Hrs) {
            const canBeAttemptedAt = new Date(new Date(questionAttemptedIn6Hrs.attemptedAt).getTime() + 6 * 60 * 60 * 1000);
            return res.status(403).json({ canBeAttemptedAt, username: user.username, currentStreak, highestStreak, score, correctAnswers, wrongAnswers, rank: userRank });
        }

        return generateQuestion('https://the-trivia-api.com/api/questions?limit=1&region=IN&difficulty=easy', res, user, currentStreak, highestStreak, score, correctAnswers, wrongAnswers, true, userRank)
    } catch (error) {
        console.error('Error fetching trivia question:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/question', verifyToken, async (req, res) => {
    // first check if a user has a question saved in db but attempt pending then only a question can be answered
    const userId = req.userId;
    const user = await User.findById(userId);

    if (!user) {
        return res.status(401).json({ error: 'User not found' });
    }

    // Check if user has a pending question (not attempted yet)
    let pendingAttemptIndex = -1;
    let questionId;

    user.questionsAttempted && user.questionsAttempted.find(
        (attempt, index) => {
            if (attempt.attemptedAt === null) {
                questionId = attempt.questionId
                pendingAttemptIndex = index;
                return true;
            }
            return false;
        }
    );

    // now fetch the api for the questionId and check if answer is correct or wrong and save accordingly in db 
    if (pendingAttemptIndex === -1 || !questionId) {
        return res.status(400).json({ error: 'No pending question to answer.' });
    }

    try {
        const response = await fetch('https://the-trivia-api.com/api/question/' + questionId);
        const data = await response.json();

        const userAnswer = req.body.answer;
        const isCorrect = userAnswer === data.correctAnswer;
        console.log(userAnswer);
        console.log(isCorrect);


        // Update the attemptedAt and isCorrect fields
        user.questionsAttempted[pendingAttemptIndex].attemptedAt = new Date();
        user.questionsAttempted[pendingAttemptIndex].isCorrect = isCorrect;
        await user.save();

        // Redis score update
        if (isCorrect) {
            // update the data in leaderboard 
            await redisClient.zIncrBy("leaderboard", 10, user.username);
        }
        // calculate the highest and current correct answer streak
        let highestStreak = 0;
        let currentStreak = 0;
        let tempStreak = 0;
        let score = 0
        let correctAnswers = 0
        let wrongAnswers = 0

        // Sort attempts by attemptedAt date ascending
        const sortedAttempts = user.questionsAttempted
            .filter(a => a.attemptedAt)

        sortedAttempts.forEach(attempt => {
            if (attempt.isCorrect) {
                tempStreak += 1;
                score += 10;
                correctAnswers += 1
                if (tempStreak > highestStreak) highestStreak = tempStreak;
            } else {
                wrongAnswers += 1
                tempStreak = 0;
            }
        });

        // Current streak is the streak at the end of the array (most recent attempts)
        currentStreak = tempStreak;
        const totalAnswers = correctAnswers + wrongAnswers;
        const accuracy = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0;
        // Add/update details in hash for more data to be displayed in the leaderboard
        await redisClient.hSet(user.username, {
            name: user.name,
            currentStreak,
            highestStreak,
            accuracy,
            correctAnswers,
            wrongAnswers
        });
        return res.status(200).json({
            isCorrect,
            correctAnswer: data.correctAnswer
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'Could not verify answer.' });
    }

})

module.exports = router;