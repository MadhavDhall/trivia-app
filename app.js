require('dotenv').config()
const express = require('express');
const dbConn = require('./dbConn')
const cookieParser = require('cookie-parser');

// Connect to MongoDB
dbConn()

const app = express();

const PORT = process.env.PORT || 3000;

const authRoutes = require('./routes/auth');
const protectedRoute = require('./routes/authenticatedRoutes')
const leaderboardRoutes = require('./routes/leaderboard')

app.use(express.json());

//cookie parser
app.use(cookieParser());

app.use('/api/', authRoutes);
app.use('/api/', protectedRoute);
app.use('/api/leaderboard', leaderboardRoutes)
//serve static folder
app.use(express.static('public'));

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});