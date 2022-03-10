const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');

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
        property.name = req.body.name;
        property.address = req.body.address;
        property.map = req.body.map;
        property.description = req.body.description;
        await property.save();
        res.status(200).json({"status": "ok", "message": "Property updated"});
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

module.exports = router;