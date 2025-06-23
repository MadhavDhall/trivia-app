const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
function verifyToken(req, res, next) {
    // const token = req.header('Authorization');

    // check token from cookies 
    console.log(req.cookies);

    const token = req.cookies && req.cookies.token;
    console.log(token);

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        req.userId = decoded.userId;
        next();
    } catch (error) {
        console.log(error);

        res.status(401).json({ error: 'Invalid token' });
    }
};

module.exports = verifyToken;