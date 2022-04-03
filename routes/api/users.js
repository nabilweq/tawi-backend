const express = require('express');
const router = express.Router();

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const Property = require('../../models/Property');
const User = require('../../models/User');

var api_key = '9dfde4e3274f4c233f9285df8e0a210e-c50a0e68-13986ca0';
var domain = 'sandboxf08bce312d544389a3cf459255c15ae8.mailgun.org';
var mailgun = require('mailgun-js')({apiKey: api_key, domain: domain});

router.get('/', (req, res) => {
    res.send("Hi, I'm the API");
});

router.post('/signup', async (req, res) => {
    //console.log(req.body);
    const email = req.body.email;
    const user = await User.findOne({ email });
    if(user) {
        return res.status(400).json({ "status": "error", "message": "User already exists" });
    }
    try {
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
            to: 'bonjour@markermore.in',
            subject: 'Request for signup',
            text: `Hello,\n\n` +
            `A user has raised a signup request.\n` +
            `Please verify the details and confirm the request.\n` +
            `Find the details below:\n\n` +
            `Name: ${req.body.f_name+' '+req.body.l_name}\n` +
            `Email: ${req.body.email}\n` +
            `Phone: ${req.body.phone}\n` +
            `Address: ${req.body.address}\n\n` +
            'Approver user - http://'+req.headers.host+'/api/users/approve-user/'+newUser._id.toString()+'\n\n'+
            'Reject user - http://'+req.headers.host+'/api/users/reject-user/'+newUser._id.toString()+'\n\n'+
            `Thank you,\n` +
            `Tawi Facilities`
        };

        await mailgun.messages().send(data).then(async (body) => {
            //console.log("mail send",body);
            res.status(200).json({ "status": "ok", "message": "Request send to the admin" });
        }).catch((err) => {
              console.log(err.message);
              res.status(500).json({"status": "error", "message": "Server error"});
        });
    } catch (err) {
        console.log(err.message);
        res.status(500).json({ "status": "error", "message": "Server error" });
    } 
});

router.get('/approve-user/:id', async (req, res) => {
    
    const user  =  await User.findById(req.params.id);
    if(!user) {
        return res.status(404).json({ "status": "error", "message": "User not found" });
    }
    user.adminApproved = true;
    await user.save()
    var data = {
        from: 'Tawi Facilities <info@tawifacilities.com>',
        to: user.email,
        subject: 'Signup request approved',
        text: `Hello,\n\n` +
        `Your request for creating account has been approved.\n\n` +
        `Please create your login password and enter to the dashboard through the link below.\n\n` +
        `http://${req.headers.host}/api/users/create-password/${req.params.id}\n\n` +
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
});

router.get('/reject-user/:id', async (req, res) => {
    const user  =  await User.findById(req.params.id);
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
        try {
            await User.deleteOneById(req.params.id);
            res.status(200).json({ "status": "ok", "message": "User rejected" });
        } catch (error) {
            res.status(500).json({"status": "error", "message": "Server error"});
        }
    }).catch((err) => {
        console.log(err.message);
        res.status(500).json({"status": "error", "message": "Server error"});
    });
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
                    res.status(200).json({"status": "ok", "message": "Password updated"});
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
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ "status": "error", "message": "Invalid credentials" });
        }

        const payload = {
            user: {
              id: user.id
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

router.post('/add-property', async(req, res) => {

    try {
        const newProperty = new Property({
            //user: user.id,
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

router.get('/get-properties', async(req, res) => {
    try {
        const properties = await Property.find();
        res.status(200).json({"status": "ok", properties});
    } catch (err) {
        console.log(err);
        res.status(500).json({"status": "error", "message": "Server error"});
    }
});

router.get('/get-property/:id', async(req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        res.status(200).json({"status": "ok", property});
    } catch (err) {
        console.log(err);
        res.status(500).json({"status": "error", "message": "Server error"});
    }
});

router.put('/update-property/:id', async(req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        if(property) {
            property.name = req.body.name;
            property.address = req.body.address;
            property.location = req.body.location;
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

router.delete('/delete-property/:id', async(req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        await property.remove();
        res.status(200).json({"status": "ok", "message": "Property deleted"});
    } catch (err) {
        console.log(err);
        res.status(500).json({"status": "error", "message": "Server error"});
    }
});

//Rooms
router.post('/add-room', async(req, res) => {

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

router.get('/get-rooms/:id', async(req, res) => {
    try {
        const properties = await Property.findOne({_id: req.params.id});
        res.status(200).json({"status": "ok", "rooms": properties.rooms});
    } catch (err) {
        console.log(err);
        res.status(500).json({"status": "error", "message": "Server error"});
    }
});

router.get('/get-a-room/id', async(req, res) => {
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

router.put('/update-room/', async(req, res) => {
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

router.delete('/delete-room/id', async(req, res) => {
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