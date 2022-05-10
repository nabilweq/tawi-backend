const express = require('express');
const router = express.Router();

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const Property = require('../../models/Property');
const User = require('../../models/User');

var api_key = process.env.MAILGUN_API_KEY;
var domain = process.env.MAILGUN_DOMAIN;
var mailgun = require('mailgun-js')({apiKey: api_key, domain: domain});

const { checkUser } = require('../../middleware/auth');

const aws = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');

// const s3 = new aws.S3({
//     accessKeyId: process.ENV.accessKeyId,
//     secretAccessKey: process.ENV.secretAccessKey,
//     region: process.ENV.region
// });

router.get('/', (req, res) => {
    res.send("Hi, I'm the API");
});

router.post('/signup', async (req, res) => {
    //console.log(req.body);
    const email = req.body.email;
    const phone = req.body.phone;
    try {
        const user = await User.findOne({ email });
        const userPhone = await User.findOne({ phone});
        if(user || userPhone) {
            return res.status(401).json({ "status": "error", "message": "User already exists with the given email or phone number." });
        }

        const newUser = new User({
            f_name: req.body.f_name,
            l_name: req.body.l_name,
            email: req.body.email,
            phone: req.body.phone,
            address: req.body.address,
        });
        await newUser.save();
        var data = {
            from: 'Tawi Facilities <info@tawifacilities.com>',
            //to: 'bonjour@markermore.in',
            to: 'nabeeltkanr@lbscek.ac.in',
            subject: 'Request for signup',
            text: `Hello,\n\n` +
            `A user has raised a signup request.\n` +
            `Please verify the details and confirm the request.\n` +
            `Find the details below:\n\n` +
            `Name: ${req.body.f_name+' '+req.body.l_name}\n` +
            `Email: ${req.body.email}\n` +
            `Phone: ${req.body.phone}\n` +
            `Address: ${req.body.address}\n\n` +
            'View user: - http://'+req.headers.host+'/api/admin/approve-user/'+newUser._id.toString()+'\n\n'+
            'Reject user - http://'+req.headers.host+'/api/admin/reject-user/'+newUser._id.toString()+'\n\n'+
            `Thank you,\n` +
            `Tawi Facilities`
        };

        await mailgun.messages().send(data).then(async (body) => {
            //console.log("mail send",body);
            res.status(200).json({ "status": "ok", "message": "User created and Request send to the admin" });
        }).catch((err) => {
            console.log(err.message);
            res.status(500).json({"status": "error", "message": "Server error"});
        });
    } catch (err) {
        console.log(err.message);
        res.status(500).json({ "status": "error", "message": "Server error" });
    }
});

router.put('/update-password/:id', async (req, res) => {
    User.findById(req.params.id, async (err, user) => {
        if (err) {
            console.log(err.message);
            res.status(500).json({"status": "error", "message": "Server error"});
        } else {
            if (user) {
                if(user.password) {
                    res.status(400).json({"status": "error", "message": "Password already exists"});
                } else {
                    const password = await bcrypt.hash(req.body.password, 10)
                    user.password = password;
                    user.save();

                    const payload = {
                        user: {
                          id: user.id,
                          admin: false
                        }
                    };
                    jwt.sign(
                        payload,
                        process.env.JWT_SECRET,
                        { expiresIn: '1 year' },
                        (err, token) => {
                          if (err) throw err;
                          res.status(200).json({"status": "ok", "message": "Password updated", "token": token});
                        }
                    );
                }
            } else {
                res.status(404).json({"status": "error", "message": "User not found"});
            }
        }
    });
});

router.post('/login', async(req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ "status": "error", "message": "User not found" });
        }
        if(!user.adminApproved) {
            return res.status(400).json({ "status": "error", "message": "User not approved" });
        }
        if( user.password) {
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ "status": "error", "message": "Invalid credentials" });
            }
        } else {
            return res.status(400).json({ "status": "error", "message": "User doesn't craeted password." })
        }

        const payload = {
            user: {
              id: user.id,
              admin: false
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
        
    } catch (err) {
        console.log(err.message);
        res.status(500).json({"status": "error", "message": "Server error"});
    }
});

//Properties

router.post('/add-property', checkUser, async(req, res) => {

    try {
        const newProperty = new Property({
            user: req.user.id,
            name: req.body.name,
            location: req.body.location,
            address: req.body.address,
            map: req.body.map,
            description: req.body.description
        });
        await newProperty.save();
        res.status(200).json({"status": "ok", "message": "Property added"});
    } catch (err) {
        console.log(err);
        res.status(500).json({"status": "error", "message": "Server error"});
    }  
});

router.post('/upload')

router.get('/get-properties', checkUser, async(req, res) => {
    try {
        const properties = await Property.find({"user": req.user.id});
        res.status(200).json({"status": "ok", properties});
    } catch (err) {
        console.log(err);
        res.status(500).json({"status": "error", "message": "Server error"});
    }
});

router.get('/get-property/:id', checkUser, async(req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        if(!property) {
            return res.status(404).json({ "status": "error", "message": "Property not found" });
        } else {
            res.status(200).json({"status": "ok", property});
        }
    } catch (err) {
        console.log(err);
        res.status(500).json({"status": "error", "message": "Server error"});
    }
});

router.put('/update-property/:id', checkUser, async(req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        if(property) {
            property.name = req.body.name;
            property.address = req.body.address;
            property.map = req.body.map;
            property.description = req.body.description;
            await property.save();
            res.status(200).json({"status": "ok", "message": "Property updated"});
        } else {
            res.status(404).json({"status": "error", "message": "Property not found"});
        }
        
    } catch (err) {
        console.log(err);
        res.status(500).json({"status": "error", "message": "Server error"});
    }
});

router.delete('/delete-property/:id', checkUser, async(req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        if(!property) { 
            return res.status(404).json({ "status": "error", "message": "Property not found" });
        } else {
            await property.remove();
            res.status(200).json({"status": "ok", "message": "Property deleted"});
        }
    } catch (err) {
        console.log(err);
        res.status(500).json({"status": "error", "message": "Server error"});
    }
});

//Rooms
router.post('/add-room', checkUser, async(req, res) => {

    try {
        //console.log(req.body);
        const newRoom = {
            name: req.body.name,
            description: req.body.description,
            adult: req.body.adult,
            child: req.body.child,
            size: req.body.size,
            bedType: req.body.bedType,
            amenities: req.body.amenities,
            price: req.body.price,
        }
        await Property.updateOne({_id: req.body.propId},{$push: { rooms: newRoom }});
        res.status(200).json({"status": "ok", "message": "Room added"});
    } catch (err) {
        console.log(err.message);
        res.status(500).json({"status": "error", "message": "Server error"});
    }  
});

router.get('/get-rooms/:id', checkUser, async(req, res) => {
    try {
        const properties = await Property.findOne({_id: req.params.id});
        res.status(200).json({"status": "ok", "rooms": properties.rooms});
    } catch (err) {
        console.log(err);
        res.status(500).json({"status": "error", "message": "Server error"});
    }
});

router.get('/get-a-room/id', checkUser, async(req, res) => {
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

router.put('/update-room/', checkUser, async(req, res) => {
    try {
        const property = await Property.findById(req.body.propId);
        const roomId = req.body.roomId;
        if(property) {
            for(let i = 0; i < property.rooms.length; i++) {
                if(property.rooms[i].id === roomId) {
                    property.rooms[i].name = req.body.name;
                    property.rooms[i].description = req.body.description;
                    property.rooms[i].adult = req.body.adult;
                    property.rooms[i].child = req.body.child;
                    property.rooms[i].size = req.body.size;
                    property.rooms[i].bedType = req.body.bedType;
                    property.rooms[i].amenities = req.body.amenities;
                    property.rooms[i].price = req.body.price;

                    await property.save();
                    return res.status(200).json({"status": "ok", "message": "Room updated"});
                }
            }
            return res.status(400).json({"status": "error", "message": "Room not found"});
        } else {
            return res.status(400).json({"status": "error", "message": "Property not found"});
        }
    } catch (err) {
        console.log(err);
        res.status(500).json({"status": "error", "message": "Server error"});
    }
});

router.delete('/delete-room/id', checkUser, async(req, res) => {
    try {
            Property.findByIdAndUpdate(
                req.query.propId,
                { $pull: { rooms: { _id: req.query.roomId } } },
                { new: true }
              ).then(()=>{
                return res.status(200).json({"status": "ok", "message": "Room deleted"});
              }).catch(()=> {
                return res.status(400).json({"status": "error", "message": "Room not found"});
              })
    } catch (err) {
        console.log(err);
        res.status(500).json({"status": "error", "message": "Server error"});
    }
});

module.exports = router;