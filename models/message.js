const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
    {
        conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'conversation' },
        sender: { type: mongoose.Schema.Types.ObjectId },
        content: String,
        timestamp: { type: Date, default: Date.now }
    },
    { collection: 'message' }
);

module.exports = mongoose.model('Message', messageSchema);