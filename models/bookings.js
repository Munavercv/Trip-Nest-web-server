const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    packageId: { type: String, required: true },
    status: { type: String, required: true },
    bookingDate: { type: String, required: true },
    paymentDetails: {
        paymentId: { type: String },
        amount: { type: Number }
    }
}, {collection: 'bookings'});

module.exports = mongoose.model('bookings', bookingSchema)