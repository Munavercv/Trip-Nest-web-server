const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    title: { type: String, required: true },
    body: { type: String },
    targetIds: [{ type: mongoose.Schema.Types.ObjectId }],
    isRead: { type: Boolean, default: false },
    navLink: { type: String },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Notification', notificationSchema);
