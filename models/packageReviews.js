const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'packages' },
    rating: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
}, { collection: 'reviews' });

module.exports = mongoose.model('packageReviews', reviewSchema);