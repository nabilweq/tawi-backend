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
    // console.log(froms);
    // console.log(tos);
    try {
        var available = [];
        const bookings = await Booking.find();
        for(var i = 0; i < bookings.length; i++) {
            if(froms >= bookings[i].from && tos < bookings[i].to) {
                available.push(bookings[i].roomId.toString());
            } else if(froms < bookings[i].from && tos > bookings[i].from) {
                available.push(bookings[i].roomId.toString());
            } else if( froms < bookings[i].to && tos > bookings[i].to) {
                available.push(bookings[i].roomId.toString());
            }
        }
        const properties = await Property.find({location: req.body.location}).select('-bookings');
        console.log(properties);
        for(var i= 0; i < properties.length; i++) {
            var count = 0;
            //console.log(properties[i].rooms);
            for(var j=0; j < properties[i].rooms.length; j++) {
                //console.log(properties[i].rooms[j]);
                if(properties[i].rooms[j].adult > req.body.adult) {
                    console.log("found -----------------------",properties[i].rooms[j]);
                    properties[i].rooms.splice(j, 1);
                } else if(properties[i].rooms[j].child > req.body.child) {
                    properties[i].rooms.splice(j, 1);
                }

                if(!available.includes(properties[i].rooms[j].id)) {
                    
                    count++;
                } else {
                    //console.log(properties[i].rooms[j]);
                    properties[i].rooms.splice(j, 1);
                }
                //console.log(properties[i].rooms[j]);
            }
            if(count === 0) {
                properties.splice(i, 1);
            }
        }
        console.log("-----");
        console.log(properties);
        //available.filter((item, index) => available.indexOf(item) === index);
        res.status(200).json({"status": "ok", properties});
    } catch (err) {
        console.log(err.message);
        re.status(500).json({"status": "error", "message": "Server error" })
    }
});

router.get('/get-all-bookings', async (req, res) => {
    try {
        const bookings = await Booking.find();
        res.json(bookings);
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
    const bookingObj = {
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
    }
    const newBooking = new Booking(bookingObj);
    try {
        const booking = await newBooking.save();
        await Property.updateOne({_id: propId},{$push: { bookings: bookingObj }});
        res.status(200).json({ "status": "ok", booking });
    } catch (err) {
        console.log(err.message);
        res.status(500).json({ "status": "error", "message": "Server error" });
    }
});

module.exports = router;