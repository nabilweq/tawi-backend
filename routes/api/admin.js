const express = require('express');
const router = express.Router();

const jwt = require('jsonwebtoken');

const Property = require('../../models/Property');
const User = require('../../models/User');
const Booking = require('../../models/Booking');

var api_key = process.env.MAILGUN_API_KEY;
var domain = process.env.MAILGUN_DOMAIN;
var mailgun = require('mailgun-js')({apiKey: api_key, domain: domain});

const { checkAdmin } = require('../../middleware/auth');

router.get('/', checkAdmin, async (req, res) => {

    try {
        const users = await User.find({ "adminApproved": true }).select('-password');
        const properties = await Property.find();
        const bookings = await Booking.find();

        let rooms = 0;
        let cBookings = 0;
        let pBookings = 0;

        for(var i=0; i< properties.length; i++) {
            for(var j=0; j<properties[i].rooms.length; j++) {
                rooms++;
            }
        }

        const date = new Date();
        var ISToffSet = 330; //IST is 5:30; i.e. 60*5+30 = 330 in minutes 
        offset= ISToffSet*60*1000;
        var today = new Date(date.getTime()+offset);
        today.setTime(Date.parse(today) + (330+ (1000 * 60 * 60 * 24)));
        //console.log(today);
        for(var i=0; i< bookings.length; i++) {
            if(bookings[i].adminApproved === false) pBookings++;
            if(bookings[i].to < today) cBookings++;
        }

        res.status(200).json({ "status": "ok", "users": users.length, "properties": properties.length, "rooms": rooms, "bookings": bookings.length, cBookings, pBookings});
    } catch (err) {
        console.log(err.message);
        res.send("Error");
    }
});

router.post('/login', (req, res ) => {
    const { email, password } = req.body;
    try {
        // const user = await User.findOne({ email });
        if (email == "admin@tawifacilities.com") {
            if( password == "admin@123" ) {
                const payload = {
                    user: {
                      id: email,
                      admin: true
                    }
                };
                jwt.sign(
                    payload,
                    process.env.JWT_SECRET,
                    { expiresIn: '1 year' },
                    (err, token) => {
                      if (err) throw err;
                      res.status(200).json({"status": "ok", "token": token});
                    }
                );
            } else {
                return res.status(401).json({ "status": "error", "message": "Invalid credentials" });
            }
        } else {
            res.status(404).json({ "status": "error", "message": "User not found" });
        }
        
    } catch (err) {
        console.log(err.message);
        res.status(500).json({"status": "error", "message": "Server error"});
    }
});

router.get('/get-all-users', checkAdmin, async(req, res) => {
    try {
        const users = await User.find({ "adminApproved": true }).select('-password');
        res.status(200).json({"status": "ok", users});
    } catch (err) {
        res.status(500).json({"status": "error", "message": "Server error"});
    }
});

router.put('/suspend-user/:id', checkAdmin, async (req, res) => {
    try {
        const user = await User.findOne({ "_id": req.params.id, "adminApproved": true}).select('-password');
        if(user) {
            if(!user.adminSuspended) {
                user.adminSuspended = true;
                await user.save();
                res.status(200).json({"status": "ok", "message": "Suspended the user"});
            } else {
                res.status(400).json({"status": "error", "message": "User already suspended"});
            }
        } else {
            res.status(400).json({"status": "error", "message": "User not found"});
        }
    } catch (err) {
        console.log(err.message);
        res.status(500).json({"status": "error", "message": "Server error"});
    }
});

router.put('/remove-suspend-user/:id', checkAdmin, async (req, res) => {
    try {
        const user = await User.findOne({ "_id": req.params.id }).select('-password');
        if(user) {
            if(user.adminSuspended) {
                user.adminSuspended = false;
                await user.save();
                res.status(200).json({"status": "ok", "message": "Suspension removed"});
            } else {
                res.status(400).json({"status": "error", "message": "User is not suspended already"});
            }
        } else {
            res.status(400).json({"status": "error", "message": "User not found"});
        }
    } catch (err) {
        console.log(err.message);
        res.status(500).json({"status": "error", "message": "Server error"});
    }
});

router.get('/get-signup-requests', checkAdmin, async (req, res) => {
    try {
        const users = await User.find({ "adminApproved": false }).select('-password');
        //console.log(users);
        res.status(200).json({"status": "ok", users});
    } catch (err) {
        console.log(err.message);
        res.status(500).json({"status": "error", "message": "Server error"});
    }
});

router.put('/approve-user/:id', checkAdmin, async (req, res) => {

    try {
        const user  =  await User.findOne({ "_id": req.params.id, "adminApproved": false});
        console.log(user)
        if(!user) {
            return res.status(404).json({ "status": "error", "message": "User not found" });
        }

        var data = {
            from: 'Tawi Facilities <info@tawifacilities.com>',
            to: user.email,
            subject: 'Signup request approved',
            text: `Hello,\n\n` +
            `Your request for creating account has been approved.\n\n` +
            `Please create your login password and enter to the dashboard through the link below.\n\n` +
            `http://localhost:3000/createpass/${req.params.id}\n\n` +
            `Thank you,\n` +
            `Tawi Facilities`
        };
        
        await mailgun.messages().send(data).then(async (body) => {
            //console.log("mail send",body);
            res.status(200).json({ "status": "ok", "message": "User approved" });
        }).catch((err) => {
            console.log(err.message);
            res.status(500).json({"status": "error", "message": "Server error"});
        });

        user.adminApproved = true;
        await user.save()
    } catch (err) {
        res.status(500).json({"status": "error", "message": "Server error"});
    }
});

router.put('/reject-user/:id', checkAdmin, async (req, res) => {
    
    try {
        const user  =  await User.findOne({ "_id": req.params.id, "adminApproved": false}).select('-password');
        if(!user) {
            return res.status(404).json({ "status": "error", "message": "User not found" });
        }

        var data = {
            from: 'Tawi Facilities <info@tawifacilities.com>',
            to: user.email,
            subject: 'Signup request rejected',
            text: `Hello,\n\n` +
            `Your request for creating account has been rejected.\n\n` +    
            `Thank you,\n` +
            `Tawi Facilities`
        };
        
        await mailgun.messages().send(data).then(async (body) => {
            //console.log("mail send",body);
            res.status(200).json({ "status": "ok", "message": "User rejected" });
        }).catch((err) => {
            console.log(err.message);
            res.status(500).json({"status": "error", "message": "Server error"});
        });

        await User.deleteOne({ "_id": req.params.id });
    } catch (err) {
        console.log(err.message);
        return res.status(500).json({"status": "error", "message": "Server error"});
    }

    
});

router.get('/get-properties', checkAdmin, async(req, res) => {
    try {
        const properties = await Property.find();
        res.status(200).json({"status": "ok", properties});
    } catch (err) {
        console.log(err);
        res.status(500).json({"status": "error", "message": "Server error"});
    }
});

router.get('/get-property/:id', checkAdmin, async(req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        res.status(200).json({"status": "ok", property});
    } catch (err) {
        console.log(err);
        res.status(500).json({"status": "error", "message": "Server error"});
    }
});

router.get('/get-rooms/:id', checkAdmin, async(req, res) => {
    try {
        const properties = await Property.findOne({_id: req.params.id});
        res.status(200).json({"status": "ok", "rooms": properties.rooms});
    } catch (err) {
        console.log(err);
        res.status(500).json({"status": "error", "message": "Server error"});
    }
});

router.get('/get-a-room/id', checkAdmin, async(req, res) => {
    try {
        
        const properties = await Property.findOne({_id: req.query.propId});
        const roomId = req.query.roomId;
        if(properties) {
            for(let i = 0; i < properties.rooms.length; i++) {
                if(properties.rooms[i].id === roomId) {
                    return res.status(200).json({"status": "ok", "room": properties.rooms[i]});
                }
            } 
            return res.status(400).json({"status": "error", "message": "Room not found"});
        } else {
            return res.status(400).json({"status": "error", "message": "property not found"});
        }
    } catch (err) {
        
        console.log(err);
        res.status(500).json({"status": "error", "message": "Server error"});
    }
});

router.get('/get-all-bookings', checkAdmin, (req, res) => {
    Booking.find({}, async (err, bookings) => {
        if(err) {
            console.log(err);
            res.status(500).json({"status": "error", "message": "Server error"});
        } else {
            //console.log(bookings);
            res.status(200).json({"status": "ok", "bookings": bookings});
        }
    });
});

router.put('/approve-booking/:id', checkAdmin, async (req, res) => {

    try {
        const booking  =  await Booking.findOne({ "_id": req.params.id, "adminApproved": false });

        if(!booking) {
            return res.status(404).json({ "status": "error", "message": "Booking not found" });
        }
        booking.adminApproved = true;
        await booking.save();
        //console.log(booking);

        const property = await Property.findById(booking.propId);
        if(!property) {
            return res.status(404).json({status: "error", message: "Property not found"});
        }
        property.bookings.push(booking);
        await property.save()
        for(var i =0; i < property.rooms.length; i++) {
            if(property.rooms[i].id == booking.roomId) {
                roomName = property.rooms[i].name;
            }
        }
        //console.log(booking.from.toString().split('T')[0]);
        
        var data = {
            from: 'Tawi Facilities <info@tawifacilities.com>',
            to: booking.email,
            subject: "Booking request approved!",
            text: `Hello ${booking.name},\n\n` +
            `Your booking request has been approved.\n\n` +
            `The booking details are as follows:\n\n` +
            `Property: ${property.name}\n` +
            `Room: ${roomName}\n` +
            `Check-in: ${booking.from}\n` +
            `Check-out: ${booking.to}\n\n` +
            `For any enquiries, please contact us at\n` +
            "90999999998\n888129819281\n\n" +
    
            `Thank you,\n` +
            `Tawi Facilities`
        };
        
        await mailgun.messages().send(data).then(async (body) => {
            //console.log("mail send",body);
            res.status(200).json({"status": "ok", "message": "Booking approved"});
        }).catch((err) => {
            console.log(err.message);
            res.status(500).json({"status": "error", "message": "Server error"});
        });
    } catch (err) {
        console.log(err.message);
        return res.status(500).json({"status": "error", "message": "Server error"});
    }
});

router.put('/reject-booking/:id', checkAdmin, async (req, res) => {
    try {
        const booking  =  await Booking.findOne({ "_id": req.params.id, "adminApproved": false });
        if(!booking) {
            return res.status(404).json({ "status": "error", "message": "Booking not found" });
        }
        await Booking.deleteOne({ "_id": req.params.id });

        const property = await Property.findById(booking.propId);
        if(!property) {
            return res.status(404).json({status: "error", message: "Property not found"});
        }
        var data = {
            from: 'Tawi Facilities <info@tawifacilities.com>',
            to: booking.email,
            subject: 'Booking request rejected!',
            text: `Hello,\n\n` +
            `Your request for booking a room in the ${property.name} property has rejected .\n\n` +   
            `For any enquiries, please contact us at\n` +
            "90999999998\n888129819281\n\n" +
            `Thank you,\n` +
            `Tawi Facilities`
        };
        
        await mailgun.messages().send(data).then(async (body) => {
            //console.log("mail send",body);
            res.status(200).json({ "status": "ok", "message": "User rejected" });
        }).catch((err) => {
            console.log(err.message);
            res.status(500).json({"status": "error", "message": "Server error"});
        });
    } catch (err) {
        console.log(err.message);
        return res.status(500).json({"status": "error", "message": "Server error"});
    }
});

module.exports = router;