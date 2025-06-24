const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const User = require('../models/User');
const redisClient = require('../redisConn');

// fetch the question and return question, options and id of the question
const fetchQuestion = async (id, user) => {
    try {
        let question;
        let options = []
        let qId = id ? id : null
        if (id) {
            const response = await fetch(`https://the-trivia-api.com/api/question/${id}`)
            const data = await response.json()

            options = [data.correctAnswer, ...data.incorrectAnswers];
            question = data.question
        } else {
            // generate a random question 
            const response = await fetch("https://the-trivia-api.com/api/questions?limit=1&region=IN&difficulty=easy")
            const data = await response.json()

            const alreadyAttempted = user.questionsAttempted && user.questionsAttempted.some(
                attempt => attempt.questionId === data[0].id
            );
            if (alreadyAttempted) {
                // Fetch a new question if already attempted
                return fetchQuestion(false, user);
            }

            options = [data[0].correctAnswer, ...data[0].incorrectAnswers];
            question = data[0].question

            qId = data[0].id
        }

        // Shuffle the options array
        for (let i = options.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [options[i], options[j]] = [options[j], options[i]];
        }

        return { question, options, qId }
    } catch (error) {
        console.log(error);
    }
}

// get user profile details like currentStreak, highestStreak, score, rank etc 
const userProfileDetails = async (user) => {
    try {
        const raw = await redisClient.zRangeWithScores("leaderboard", 0, -1, { REV: true });

        let rank = 0, score = 0
        const userIndex = raw.findIndex(entry => entry.value === user.username)

        // userIndex is -1 ie does such player does not index until player has not submitted a correct answer 
        if (userIndex >= 0) {
            rank = userIndex + 1
            score = raw[userIndex].score
        }

        const userData = await redisClient.hGetAll(user.username)
        // userData does not exist until player has not submitted any answer 
        if (userData) {
            const { highestStreak, currentStreak, correctAnswers, wrongAnswers } = userData

            const attempted = parseInt(correctAnswers || "0", 10) + parseInt(wrongAnswers || "0", 10);
            const accuracy = parseInt(correctAnswers || "0", 10) / attempted

            return { highestStreak, currentStreak, score, correctAnswers, wrongAnswers, rank, accuracy: accuracy * 100 }
        }

        return { highestStreak: 0, currentStreak: 0, score: 0, correctAnswers: 0, wrongAnswers: 0, rank: 0, accuracy: 0 }
    } catch (error) {
        console.log(error);
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

        console.log("user profile. ", await userProfileDetails(user));

        const { highestStreak, currentStreak, score, correctAnswers, wrongAnswers, accuracy, rank } = await userProfileDetails(user)

        // Check if user has a pending question (not attempted yet)
        const pendingAttempt = user.questionsAttempted && user.questionsAttempted.find(
            attempt => attempt.attemptedAt === null
        );
        if (pendingAttempt) {
            const { question, options } = await fetchQuestion(pendingAttempt.questionId)
            return res.status(200).json({ question, options, username: user.username, currentStreak, highestStreak, score, correctAnswers, wrongAnswers, accuracy, rank });
        }

        // check if the user has attempted a question 6 hrs ago
        const currentTime = new Date();
        const sixHoursAgo = new Date(currentTime.getTime() - 6 * 60 * 60 * 1000);

        // check if a question was attempted in the last 6 hours
        let questionAttemptedIn6Hrs = false;
        user.questionsAttempted ? user.questionsAttempted.forEach(attempt => {
            if (new Date(attempt.attemptedAt) > sixHoursAgo) {
                questionAttemptedIn6Hrs = attempt;
            }
            return attempt
        }) : ""

        if (questionAttemptedIn6Hrs) {
            const canBeAttemptedAt = new Date(new Date(questionAttemptedIn6Hrs.attemptedAt).getTime() + 6 * 60 * 60 * 1000);
            return res.status(403).json({ canBeAttemptedAt, username: user.username, currentStreak, highestStreak, score, correctAnswers, wrongAnswers, accuracy, rank });
        }

        // else generate a question randomly and check that this question is not already attempted by the user
        const { question, options, qId } = await fetchQuestion(false, user)
        // now save the question id in the db 
        user.questionsAttempted = user.questionsAttempted || [];
        user.questionsAttempted.push({
            questionId: qId,
            attemptedAt: null
        });
        await user.save();
        return res.status(200).json({ question, options, username: user.username, currentStreak, highestStreak, score, correctAnswers, wrongAnswers, accuracy, rank });
    } catch (error) {
        console.error('Error fetching trivia question:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/question', verifyToken, async (req, res) => {
    try {
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

        const response = await fetch('https://the-trivia-api.com/api/question/' + questionId);
        const data = await response.json();

        const userAnswer = req.body.answer;
        const isCorrect = userAnswer === data.correctAnswer;

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
        let correctAnswers = 0
        let wrongAnswers = 0

        // Sort attempts by attemptedAt date ascending
        const sortedAttempts = user.questionsAttempted
            .filter(a => a.attemptedAt)

        sortedAttempts.forEach(attempt => {
            if (attempt.isCorrect) {
                tempStreak += 1;
                correctAnswers += 1
                if (tempStreak > highestStreak) highestStreak = tempStreak;
            } else {
                wrongAnswers += 1
                tempStreak = 0;
            }
        });

        // Current streak is the streak at the end of the array (most recent attempts)
        currentStreak = tempStreak;

        // Add/update details in hash for more data to be displayed in the leaderboard
        await redisClient.hSet(user.username, {
            name: user.name,
            currentStreak,
            highestStreak,
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