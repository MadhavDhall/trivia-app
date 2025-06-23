const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    questionsAttempted: [
        {
            questionId: { type: String, required: true },
            attemptedAt: { type: Date },
            isCorrect: { type: Boolean, default: false, required: true }
        }
    ]
});
module.exports = mongoose.model('User', userSchema);