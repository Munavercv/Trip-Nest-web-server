const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    password: { type: String },
    dpUrl: { type: String },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date },
});

module.exports = mongoose.model('user', userSchema);