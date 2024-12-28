const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    vendorId: { type: String, required: true },
    amount: { type: Number, required: true },
    success: { type: Boolean, required: true },
    transactionId: { type: String },
    date: { type: String, required: true }
}, { collection: 'payments' })

module.exports = mongoose.model('payments', paymentSchema)