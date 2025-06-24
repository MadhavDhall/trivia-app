const express = require("express");
const redisClient = require("../redisConn");
const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const players = await redisClient.zRangeWithScores("leaderboard", -10, -1, { REV: true });

        const fullData = await Promise.all(players.map(async (entry) => {
            const stats = await redisClient.hGetAll(entry.value);
            const { correctAnswers, wrongAnswers } = stats
            const attempted = parseInt(correctAnswers || "0", 10) + parseInt(wrongAnswers || "0", 10);
            const accuracy = parseInt(correctAnswers || "0", 10) / attempted

            return {
                username: entry.value,
                score: entry.score,
                ...stats,
                accuracy: accuracy * 100
            };
        }));

        res.json(fullData);
    } catch (err) {
        res.status(500).json({ error: "Redis error", details: err.message });
    }
});

router.get("/stats", async (req, res) => {
    try {
        // to get the score 
        const players = await redisClient.zRangeWithScores("leaderboard", -10, -1, { REV: true });

        const totalPlayers = players.length;
        console.log(typeof totalPlayers);

        let totalQuestionsSolved = 0;
        let scoreSum = 0;
        let highestStreakEver = 0;

        for (const entry of players) {
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

module.exports = router;
