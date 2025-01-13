const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
    vendorId: { type: String, required: true },
    title: { type: String, required: true },
    imageUrl: { type: String },
    description: { type: String },
    category: { type: String, required: true },
    destination: { type: String, required: true },
    days: { type: Number, required: true },
    startDate: { type: Date, required: true },
    price: { type: Number, required: true },
    inclusions: { type: [String] },
    transportationMode: { type: String, required: true },
    totalSlots: { type: Number },
    availableSlots: { type: Number },
    status: { type: String, required: true },
    avgRating: { type: Number },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, default: Date.now }

}, { collection: 'packages' })

module.exports = mongoose.model('packages', packageSchema);