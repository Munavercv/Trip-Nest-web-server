const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'packages', required: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'vendors', required: true },
    numberOfSeats: { type: Number, required: true },
    specialRequests: { type: String },
    totalAmount: { type: Number, required: true },
    status: { type: String, required: true },
    bookingDate: { type: Date, default: Date.now },
    paymentDetails: {
        status: { type: Boolean },
        orderId: { type: String },
    },
}, { collection: 'bookings' });

module.exports = mongoose.model('bookings', bookingSchema)