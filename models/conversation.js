const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    participants: [{ type: mongoose.Schema.Types.ObjectId }],
    createdAt: { type: Date, default: Date.now },
    lastMessage: {
        content: String,
        timestamp: Date,
        sender: { type: mongoose.Schema.Types.ObjectId }
    },
},{collection: 'conversation'});

module.exports = mongoose.model('conversations', conversationSchema);
