const express = require('express');
const router = express.Router();

const Property = require('../../models/Property');
const Booking = require('../../models/Booking');
  
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
        var available = [];
        console.log(froms,tos)
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
        const properties = await Property.find({"location": req.body.location}).select('-bookings');
        //console.log(properties);
        // for(var x= 0; x < properties.length; x++) {
        //     for(var y = 0; y < properties[x].rooms.length; y++) {
        //         if(properties[x].rooms[y].adult < req.body.adult || properties[x].rooms[y].child < req.body.child) {
        //             console.log(properties[x].rooms[y].adult, req.body.adult, properties[x].rooms[y].child, req.body.child);
        //             properties[x].rooms.splice(y, 1);
        //         }
        //     }
        // }
        for(var i= 0; i < properties.length; i++) {
            var count = 0;

            for(var j=0; j < properties[i].rooms.length; j++) {
                
                // if(properties[i].rooms[j].adult < req.body.adult) {
                //     console.log("found -----------------------",properties[i].rooms[j]);
                //     properties[i].rooms.splice(j, 1);
                // } else if(properties[i].rooms[j].child < req.body.child) {
                //     console.log("found -----------------------",properties[i].rooms[j]);
                //     properties[i].rooms.splice(j, 1);
                // }
                //console.log(i);
                if(!available.includes(properties[i].rooms[j].id)) {
                    count++;
                } else {
                    console.log("removing-----------------",properties[i].rooms[j]);
                    properties[i].rooms.splice(j, 1);
                }
                //console.log(properties[i].rooms[j]);
            }
            if(count === 0) {
                properties.splice(i, 1);
            }
        }
        // console.log("-----");
        // console.log(properties);
        //available.filter((item, index) => available.indexOf(item) === index);
        res.status(200).json({"status": "ok", properties});
    } catch (err) {
        console.log(err);
        res.status(500).json({"status": "error", "message": "Server error" })
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

var api_key = process.env.MAILGUN_API_KEY;
var domain = process.env.MAILGUN_DOMAIN;
var mailgun = require('mailgun-js')({apiKey: api_key, domain: domain});

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
        const property = await Property.findById(propId);
        if(!property) {
            return res.status(404).json({status: "error", message: "Property not found"});
        }

        for(var i =0; i < property.rooms.length; i++) {
            console.log(property.rooms[i].id);
            if(property.rooms[i].id == roomId) {
                roomName = property.rooms[i].name;
            }
        }
        //console.log(roomName);
        //send mail
        //req.headers.host
        //console.log(email);
        var data = {
            from: 'Tawi Facilities <info@tawifacilities.com>',
            to: 'bonjour@markermore.in , muhammednabeeltkanr@gmail.com',
            //to: 'muhammednabeeltkanr@gmail.com',
            subject: 'Request for booking confirmation',
            text: 'Hello,\n\n' +
            'A request for booking has placed.\n\n' +
            'Please find the details below:\n\n' +
            'Property: ' + property.name + '\n' +
            'Room: ' + roomName + '\n' +
            'Client: ' + req.body.name + '\n' +
            'Phone: ' + req.body.phone + '\n' +
            'Email: ' + req.body.email + '\n' +
            'From: ' + req.body.from + '\n' +
            'To: ' + req.body.to + '\n' +
            'Price: ' + req.body.price + '\n\n' +
            'Thank you,\n' +
            'Tawi Facilities'
          };
          
          await  mailgun.messages().send(data, function (error, body) {
              if(error) {
                  console.log(error);
                  return res.status(500).json({ "status": "error", "message": "Server error" });
              } 
              console.log("mail send",body);
              res.status(200).json({ "status": "ok", booking });
          });

    } catch (err) {
        console.log(err.message);
        res.status(500).json({ "status": "error", "message": "Server error" });
    }
});

module.exports = router;
