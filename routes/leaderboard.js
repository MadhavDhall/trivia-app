const express = require("express");
const redisClient = require("../redisConn");
const verifyToken = require("../middleware/auth");
const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const rawLeaderboard = await redisClient.zRangeWithScores("leaderboard", 0, -1, { REV: true });

        let lastScore = null;
        let currentRank = 0;
        let actualRank = 0;

        const top = await redisClient.zRangeWithScores("leaderboard", -10, -1, { REV: true });

        const fullData = await Promise.all(top.map(async (entry) => {
            const stats = await redisClient.hGetAll(entry.value);
            return {
                username: entry.value,
                score: entry.score,
                ...stats
            };
        }));

        res.json(fullData);


        // this give the people with same score the same ranks  
        // const leaderboard = rawLeaderboard.map((entry, i) => {
        //     const score = entry.score;
        //     const username = entry.value;

        //     actualRank++;

        //     if (score !== lastScore) {
        //         currentRank = actualRank;
        //         lastScore = score;
        //     }

        //     return {
        //         username,
        //         score,
        //         rank: currentRank
        //     };
        // });


        // res.json(leaderboard);
    } catch (err) {
        res.status(500).json({ error: "Redis error", details: err.message });
    }
});

router.get("/stats", async (req, res) => {
    try {
        // to get the score 
        const top = await redisClient.zRangeWithScores("leaderboard", -10, -1, { REV: true });

        const totalPlayers = top.length;
        console.log(typeof totalPlayers);

        let totalQuestionsSolved = 0;
        let scoreSum = 0;
        let highestStreakEver = 0;

        for (const entry of top) {
            const userKey = entry.value;
            const stats = await redisClient.hGetAll(userKey);

            scoreSum += entry.score;

            const attempted = parseInt(stats.correctAnswers || "0", 10) + parseInt(stats.wrongAnswers || "0", 10);
            const highestStreak = parseInt(stats.highestStreak || "0", 10);

            highestStreakEver = highestStreak > highestStreakEver ? highestStreak : highestStreakEver;

            totalQuestionsSolved += attempted;
        }

        const averageScore = totalPlayers > 0
            ? (scoreSum / totalPlayers).toFixed(2)
            : "0.00";

        res.json({
            totalPlayers,
            totalQuestionsSolved,
            averageScore,
            highestStreakEver
        });

    } catch (err) {
        res.status(500).json({ error: "Redis error", details: err.message });
    }
});

router.get("/user", verifyToken, async (req, res) => {
    const username = req.params.username;

    try {
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

            if (name === username) {
                userRank = currentRank;
                userScore = score;
                break; // Stop once found
            }
        }

        if (userRank === null) {
            return res.status(404).json({ message: "User not found in leaderboard." });
        }

        res.json({
            username,
            score: userScore,
            rank: userRank
        });

    } catch (err) {
        res.status(500).json({ error: "Redis error", details: err.message });
    }
});


module.exports = router;
