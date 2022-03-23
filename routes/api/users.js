const express = require('express');
const router = express.Router();

const Property = require('../../models/Property');

router.get('/', (req, res) => {
    res.send("Hi, I'm the API");
});

//Properties

router.post('/add-property', async(req, res) => {

    try {
        const newProperty = new Property({
            //user: user.id,
            name: req.body.name,
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
            occupancy: req.body.occupancy,
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
                    property.rooms[i].occupancy = req.body.occupancy;
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
        //const property = await Property.findById(req.query.propId);
        const roomId = req.query.roomId;
        // if(property) {
            Property.findByIdAndUpdate(
                req.query.propId,
                { $pull: { rooms: { _id: roomId } } },
                { new: true }
              ).then(()=>{
                return res.status(200).json({"status": "ok", "message": "Room deleted"});
              }).catch(()=> {
                return res.status(400).json({"status": "error", "message": "Room not found"});
              })
              
            // for(let i = 0; i < property.rooms.length; i++) {
            //     if(property.rooms[i].id === roomId) {
            //         property.rooms.splice(i, 1);
            //         await property.save();
                
            //     }
            // }
            
        // } else {
        //     return res.status(400).json({"status": "error", "message": "Property not found"});
        // }
    } catch (err) {
        console.log(err);
        res.status(500).json({"status": "error", "message": "Server error"});
    }
});

module.exports = router;