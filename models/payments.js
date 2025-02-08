const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'bookings', required: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'vendors', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    amount: { type: Number, required: true },
    status: { type: String, required: true },
    paymentId: { type: String, default: null },
    orderId: { type: String, unique: true, required: true },
    date: { type: Date, required: true, default: Date.now }
}, { collection: 'payments' })

module.exports = mongoose.model('payments', paymentSchema)