const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// User registration
router.post('/register', async (req, res) => {
    try {
        const { name, username, password } = req.body;

        const usernameExists = await User.findOne({ username });
        if (usernameExists) {
            return res.status(401).json({ error: 'Username already exists, try another.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ name, username, password: hashedPassword });
        await user.save();

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, {
            expiresIn: '2d',
        });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: true,
            maxAge: 2 * 24 * 60 * 60 * 1000 // 2 days
        });
        res.status(201).json({ token });
    } catch (error) {
        res.status(500).json({ error: 'Registration failed. Try again.' });
    }
});

// User login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log(req.body);

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ error: 'Wrong Credentials' });
        }
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Wrong Credentials' });
        }
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, {
            expiresIn: '2d',
        });
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: true,
            maxAge: 2 * 24 * 60 * 60 * 1000 // 2 days
        });
        res.status(200).json({ token });
    } catch (error) {
        console.log(error);

        res.status(500).json({ error: 'Login failed. Try again.' });
    }
});

// user logout
router.post('/logout', (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: true,
    });
    res.status(200).json({ message: 'Logged out successfully.' });
});

module.exports = router;