const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    f_name: {
        type: String,
        required: true
    },
    l_name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phone: {
        type: Number,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: false
    },
    address: {
        type: String,
        required: true
    },
    adminApproved: {
        type: Boolean,
        default: false
    },
    adminSuspended: {
        type: Boolean,
        default: false
    },
    resetPasswordToken: {
        type: String,
    },
    resetPasswordExpires: {
        type:Date
    }
});

module.exports = user = mongoose.model('user', UserSchema);