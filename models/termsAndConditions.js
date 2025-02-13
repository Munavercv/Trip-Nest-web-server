const mongoose = require('mongoose');

const termsSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    content: {
        type: [String],
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
}, { collection: 'terms_conditions' });

module.exports = mongoose.model('TermsConditions', termsSchema);
