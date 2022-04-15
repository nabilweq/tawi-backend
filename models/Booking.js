const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
    // user: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     required: true
    // },
    propId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    roomId:{
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: Number,
        required: true
    },
    country: {
        type: String,
        required: true
    },
    from: {
        type: Date,
        required: true,
    },
    to: {
        type: Date,
        required: true
    },
    duration: {
        type: Number,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    adminApproved: {
        type: Boolean,
        default: false
    },
});

module.exports = booking = mongoose.model('booking', BookingSchema);