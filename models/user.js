const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    createdAt: {type: Date, required: true},
    updatedAt: {type: Date},
});

module.exports = mongoose.model('user', userSchema);