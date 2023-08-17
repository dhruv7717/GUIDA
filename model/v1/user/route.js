var express = require('express');
var router = express.Router();
var Validator = require('Validator');
var user = require('./user_models');
var middleware = require('../../../middleware/validation');
var stripe = require('../../../config/custome_stripe');


// define a route for sending S3 Bucket credentials.
router.get('/sendS3BucketCredentials', (req, res) => {
    middleware.decryption(req.body, (request) => {
        var keys = {
            "S3_BUCKET_KEYS": {
                S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
                S3_BUCKET_KEY: process.env.S3_BUCKET_KEY,
                S3_BUCKET_SECRET: process.env.S3_BUCKET_SECRET,
                S3_BUCKET_REGION: process.env.S3_BUCKET_REGION,
                S3_BUCKET_ROOT: process.env.S3_BUCKET_ROOT
            }
        }
        response_data = {
            code: '1',
            message: "S3 Bucket Credentials Found",
            data: keys
        }
        middleware.encryption(response_data, (response) => {
            res.status(200);
            res.json(response)
        })
        // middleware.send_response(req, res, '1', "S3 Bucket Credentials Found", keys);
    })
})

// define a route for getting complete details of user.
router.get('/getUserCompleteDetails', (req, res) => {
    middleware.decryption(req.body, (request) => {
        var user_id = req.user_id;
        user.getUserCompleteDetails(request, user_id, (code, message, data) => {
            middleware.send_response(req, res, code, message, data);
        });
    })
})

// define a route for findMyGuide.
router.post('/findMyGuide', (req, res) => {
    middleware.decryption(req.body, (request) => {
        var user_id = req.user_id
        const rules = {
            latitude: 'required|numeric',
            longitude: 'required|numeric'
        };
        const messages = {
            required: req.language.rest_keywords_required_message,
            numeric: req.language.rest_keywords_number_message
        };
        if (middleware.checkvalidationRule(request, res, rules, messages)) {
            user.findMyGuide(request, user_id, (code, message, data) => {
                middleware.send_response(req, res, code, message, data);
            });
        }
    });
});

// define a route for getting guide details.
router.post('/guideDetails', (req, res) => {
    middleware.decryption(req.body, (request) => {
        var user_id = req.user_id;
        var rules = {
            user_id: 'required|numeric',
            guide_id: 'required|numeric'
        }
        var messages = {
            required: req.language.rest_keywords_required_message,
            numeric: req.language.rest_keywords_numeric_message
        }
        if (middleware.checkvalidationRule(request, res, rules, messages)) {
            user.guideDetails(request, user_id, (code, message, data) => {
                middleware.send_response(req, res, code, message, data);
            })
        }

    })
})

// define a rotue for getting guide profile.
router.get('/guideProfile', (req, res) => {
    middleware.decryption(req.body, (request) => {
        var user_id = req.user_id;
        user.guideProfile(request, user_id, (code, message, data) => {
            middleware.send_response(req, res, code, message, data);
        });
    });
});

// define a route for seeing plan.
router.post('/seePlan', (req, res) => {
    middleware.decryption(req.body, (request) => {
        var rules = {
            guide_id: 'required|numeric'
        }
        var messages = {
            required: req.language.rest_keywords_required_message,
            numeric: req.language.rest_keywords_numeric_message   
        }
        if (middleware.checkvalidationRule(request, res, rules, messages)) {
            user.seePlan(request, (code, message, data) => {
                middleware.send_response(req, res, code, message, data);
            })
        }
    })
})

// define a route for getting rating and review given by customer.
router.post('/getRatingsAndReviews', (req, res) => {
    middleware.decryption(req.body, (request) => {
        var user_id = req.user_id;
        var rules = {
            guide_id: 'required|numeric',
            page: 'required|numeric',
            limit: 'required|numeric'
        }
        var messages = {
            required: req.language.keyword_required_message,
            numeric: req.language.keyword_numeric_message
        }
        if (middleware.checkvalidationRule(request, res, rules, messages)) {
            user.getRatingsAndReviews(request, user_id, (code, message, data) => {
                middleware.send_response(req, res, code, message, data);
            });
        }
    });
});

// define a route for selecting plan.
router.post('/selectPlan', (req, res) => {
    middleware.decryption(req.body, (request) => {
        var user_id = req.user_id;
        var rules = {
            guide_id: 'required|numeric',
            activity_id: 'required|numeric',
            plan_id: 'required|numeric',
        }
        var messages = {
            required: req.language.keyword_required_message,
            numeric: req.language.keyword_numeric_message
        }
        if (middleware.checkvalidationRule(request, res, rules, messages)) {
            user.selectPlan(request, user_id, (code, message, data) => {
                middleware.send_response(req, res, code, message, data);
            });
        }
    });
})

// define a route for booking a guide.
router.post('/bookGuide', (req, res) => {
    middleware.decryption(req.body, (request) => {
        var user_id = req.user_id;
        var rules = {
            guide_id: 'required|numeric',
            plan_id: 'required|numeric',
            activity_id: 'required',
            availability_id: 'required',
            region_id:"required",
            card_id: 'required|numeric',
            total_amount: 'required|numeric',
            payment_type: 'required'
        }
        var messages = {
            required: req.language.rest_keywords_required_message,
            numeric: req.language.rest_keywords_numeric_message,
        };
        if (middleware.checkvalidationRule(request, res, rules, messages)) {
            user.bookGuide(request, user_id, (code, message, data) => {
                middleware.send_response(req, res, code, message, data);
            });
        }
    });
})

// define a route for getting Booking Details.
router.post('/bookingDetails', (req, res) => {
    middleware.decryption(req.body, (request) => {
        var user_id = req.user_id;
        var rules = {
            // user_type: 'required',
            booking_id: 'required|numeric',
        }
        var messages = {
            required: req.language.rest_keywords_required_message,
            numeric: req.language.rest_keywords_numeric_message,
        };
        if (middleware.checkvalidationRule(request, res, rules, messages)) {
            user.bookingDetails(request, user_id, (code, message, data) => {
                middleware.send_response(req, res, code, message, data);
            });
        }
    });

})

//define a route for adding new card.
router.post('/addNewCard', (req, res) => {
    middleware.decryption(req.body, (request) => {

        request.user_id = req.user_id;

        var rules = {

            card_number: 'required',
            name_on_card: 'required',
            exp_month: 'required',
            exp_year: 'required',
            cvc: 'required'

        }
        var messages = {
            required: req.language.rest_keywords_required_message
        }
        if (middleware.checkvalidationRule(request, res, rules, messages)) {
            user.addNewCard(request, (code, message, data) => {
                middleware.send_response(req, res, code, message, data);
            });
        }
    });
});

// define a route for deleting card.
router.post('/deleteCard', (req, res) => {
    middleware.decryption(req.body, (request) => {
        var user_id = req.user_id;
        var rules = {
            card_id: 'required|numeric'
        }
        var messages = {
            required: req.language.rest_keywords_required_message,
            numeric: req.language.rest_keywords_numeric_message,
            exists: req.language.rest_keywords_exists_message
        }
        if (middleware.checkvalidationRule(request, res, rules, messages)) {
            user.deleteCard(request, user_id, (code, message, data) => {
                middleware.send_response(req, res, code, message, data);
            });
        }
    })
})

// define a route for getting card list of particular user.
router.get('/getCardList', (req, res) => {
    middleware.decryption(req.body, (request) => {
        var user_id = req.user_id;
        user.getCardList(request, user_id, (code, message, data) => {
            middleware.send_response(req, res, code, message, data);
        });
    })
})

// define a route for getting chat list of particular user.
router.get('/getMyChatList', (req, res) => {
    middleware.decryption(req.body, (request) => {
        var request = {
            limit: req.query.limit || 10,  // Set a default limit if not provided
            offset: req.query.offset || 0  // Set a default offset if not provided
        };
        var user_id = req.user_id;
        user.getMyChatList(request, user_id, (code, message, data) => {
            middleware.send_response(req, res, code, message, data);
        });
    })
});

// define a route for sending message.(user -> guide)
router.post("/send_message", (req, res) => {
    middleware.decryption(req.body, (request) => {
        var user_id = req.user_id;
        var rules = {
            chatroom_id: 'required|numeric',
            sender_id: 'required|numeric',
            sender_type: 'required|in:user,guide',
            reciver_id: 'required|numeric',
            reciver_type: 'required|in:user,guide',
            message: 'required',
            message_type: 'required|in:text,image,video,audio,location'
        }
        var messages = {
            required: req.language.rest_keywords_required_message,
            numeric: req.language.rest_keywords_numeric_message,
            in: req.language.rest_keywords_in_message
        }
        if (middleware.checkvalidationRule(request, res, rules, messages, keywords)) {
            user.sendMessage(request, user_id, (code, message, data) => {
                middleware.send_response(req, res, code, message, data);
            });
        }
    });
});

// define a route for adding rating & review to guide.
router.post('/addRatingReview', (req, res) => {
    middleware.decryption(req.body, (request) => {
        var user_id = req.user_id;

        var rules = {
            booking_id: 'required|numeric',
            guide_id: 'required|numeric',
            rating: 'required|numeric|min:1|max:5',
            // review: 'required|string',
        }
        var messages = {
            required: req.language.rest_keywords_required_message,
        }
        if (middleware.checkvalidationRule(request, res, rules, messages)) {
            user.addRatingReview(request, user_id, (code, message, data) => {
                middleware.send_response(req, res, code, message, data);
            });
        }
    });
})

// define a route for getting notification list.
router.get('/getNotification', (req, res) => {
    middleware.decryption(req.body, (request) => {
        var request = req.body;
        var user_id = req.user_id;
        user.getNotification(user_id, (code, message, data) => {
            middleware.send_response(req, res, code, message, data);
        });
    });
});



router.get('/mypaymant', (req, res) => {
    middleware.decryption(req.body, (request) => {
        request.user_id = req.user_id;        
            user.mypaymant(request, (code, message, data) => {
                middleware.send_response(req, res, code, message, data);
            });
    });
});


/**
 * create 3D Secure Payment
 */

router.post('/create-3d-secure-payment', (req, res) => {
    middleware.decryption(req.body, (request) => {
        request.user_id = req.user_id;

        var rules = {

            amount: 'required',
           
        }
        var messages = {
            required: req.language.rest_keywords_required_message
        }
        if (middleware.checkvalidationRule(request, res, rules, messages)) {
            user.create3DSecurePayment(request, (data, message, code) => {
                middleware.send_response(req, res, code, message, data);
            });
        }
    });
});



module.exports = router;
