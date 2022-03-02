const mongoose = require('mongoose');

const PropertySchema = new mongoose.Schema({
    // user: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     required: true
    // },
    name: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    map: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    images: [
        {
            type: String,
            required: true
        }
    ],
    rooms: [
        {
            name: {
                type: String,
                required: true
            },
            description: {
                type: String,
                required: true
            },
            images: [
                {
                    type: String,
                    required: true
                }
            ],
            occupancy: {
                type: Number,
                required: true
            },
            size: {
                type: Number,
                required: true
            },
            bedType: {
                type: String,
                required: true
            },
            amenities: [
                {
                    type: String,
                    required: true
                }
            ],
            price: {
                first: {
                    type: Number,
                    required: true
                },
                second: {
                    type: Number,
                    required: true
                },
                third: {
                    type: Number,
                    required: true
                },
                fourth: {
                    type: Number,
                    required: true
                },
                hotDeal: [
                    {
                        discount:{
                            type: Number,
                            required: true
                        },
                        category: {
                            type: String,
                            required: true
                        }
                    }
                ]
            }
        }
    ]
})

module.exports = Property = mongoose.model('property', PropertySchema);