const express = require('express');
const router = express.Router();

const moment = require('moment')
const momentTimezone = require('moment-timezone')

const Property = require('../../models/Property');
const Booking = require('../../models/Booking');

// Function to convert UTC JS Date object to a Moment.js object in AEST
const dateAEST = date => {
    return momentTimezone(date).tz("Asia/Kolkata");
}
  
  // Function to calculate the duration of the hours between the start and end of the booking
const durationDays = (from, to) => {
    const diffTime = Math.abs(to - from);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays;
}

router.post('/check-availability', async (req, res) => {
    const froms = new Date(req.body.from);
    const tos = new Date(req.body.to);
    froms.setTime(Date.parse(froms) + (330+ (1000 * 60 * 60 * 24)));
    tos.setTime(Date.parse(tos) + (330+ (1000 * 60 * 60 * 24)));

    try {
        const available = await Booking.find({ 
            from: {
                $gte: froms,
                $lte: tos
            },
            to: {
                $gte: froms,
                $lte: tos
            }
        });
        console.log(available);
    } catch (err) {
        console.log(err.message);
    }
});

router.post('/confirm-booking', async (req, res) => {
    //console.log(req.body);
    const { propId, roomId, name, email, phone, country, price } = req.body;

    const from = new Date(req.body.from);
    const to = new Date(req.body.to);
    from.setTime(Date.parse(from) + (330+ (1000 * 60 * 60 * 24)));
    to.setTime(Date.parse(to) + (330+ (1000 * 60 * 60 * 24)));
    
    const newBooking = new Booking({
        propId,
        roomId,
        name,
        email,
        phone,
        country,
        from,
        to,
        duration: durationDays(from, to),
        price,
    });
    try {
        const booking = await newBooking.save();
        res.status(200).json({ "status": "ok", "message": "Booking confirmed", booking });
    } catch (err) {
        console.log(err.message);
        res.status(500).json({ "status": "error", "message": "Server error" });
    }
});

module.exports = router;