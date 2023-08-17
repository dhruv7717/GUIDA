var express = require('express');
var router = express.Router();
var middleware = require('../../../middleware/validation');
var auth = require('./auth_model');
var multer = require('multer');
var path = require('path');
const user = require('./auth_model');


/*
* Multer Using file Upload
*/

var storage = multer.diskStorage({

    destination: function (req, file, cb) {
        cb(null, '../api/public/Bank_image');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname))
    }
});

var upload = multer({
    storage: storage,
    limits: {
        fileSize: (12 * 1024 * 1024)
    }
}).single('bank_image');

// Upload Profile Image
router.post('/upload_bank_image', function (req, res) {
    upload(req, res, function (error) {
        if (error) {
            middleware.send_response(req, res, '0', { keywords: "keywords_upload_Bank_image_error_message", content: {} }, null)
        } else {
            middleware.send_response(req, res, '1', { keywords: "keywords_upload_Bank_image_success_message", content: {} }, { image: req.file.filename });
        }
    });
});


//      ===>>   route for signup 
router.post('/signup', (req, res) => {
    middleware.decryption(req.body, function (request) {
        var rules =
        {
            user_type: 'required',
            first_name: 'required',
            last_name: 'required',
            email: 'required|email',
            password: 'required',
            device_type: 'required|in:A,I,W',
        };

        var message =
        {
            required: req.language.keyword_required_message,
            email: req.language.keyword_email_right_message,
            Alpha: req.language.keyword_Alphanumeric_message
        };

        if (middleware.checkvalidationRule(request, res, rules, message)) {
            auth.signup(request, function (code, message, data) {
                middleware.send_response(req, res, code, message, data)
            })
        };
    });
});

//     ===>>   route login   
router.post('/login', (req, res) => {
    middleware.decryption(req.body, (request) => {

        var rules =
        {
            email: 'required',
            password: 'required',
            device_type: '',
            device_token: ''
        }
        var message =
        {
            required: req.language.keyword_required_message
        }
        if (middleware.checkvalidationRule(request, res, rules, message)) {
            auth.login(request, (code, message, data) => {
                middleware.send_response(req, res, code, message, data)
            })
        }
    });
});

//     ===>>   route send otp   
router.post('/sendotp', (req, res) => {
    middleware.decryption(req.body, function (request) {
        var rules =
        {

            email: "required|email",
            type: "required|in:signup,forgotpassword"
        }
        var message = {

            required: req.language.keyword_required_message,
        }
        if (middleware.checkvalidationRule(request, res, rules, message)) {
            auth.sendotp(request, (code, message, data) => {
                middleware.send_response(req, res, code, message, data)
            });
        }
    })
});

//========>>  route resend otp 
router.post('/resendotp', (req, res) => {
    middleware.decryption(req.body, (request) => {
        var rules = {

            email: 'required'
        }
        var message = {
            required: req.language.keyword_required_message
        }
        if (middleware.checkvalidationRule(request, res, rules, message)) {
            auth.resendotp(request, (code, message, data) => {
                middleware.send_response(req, res, code, message, data);
            })
        }
    })
});

//========>>   route Reset Password
router.post('/resetpassword', function (req, res) {
    middleware.decryption(req.body, function (request) {

        let rules = {
            new_password: "required"
        }
        let message = {
            required: req.language.rest_keywords_requires_message
        }

        if (middleware.checkvalidationRule(request, res, rules, message)) {
            auth.resetpassword(request, (code, message, data) => {
                middleware.send_response(req, res, code, message, data)
            })
        }
    })
})

//========>>     route Log Out  
router.post('/logout', (req, res) => {
    middleware.decryption(req.body, (request) => {
        var user_id = req.user_id;
        auth.logoutUser(user_id, (code, message, data) => {
            middleware.send_response(req, res, code, message, data);
        });
    })
})
// ========>>    route for getting customer profile.  
router.get('/customerProfile', (req, res) => {
    middleware.decryption(req.body, (request) => {
        var user_id = req.user_id;
        auth.customerProfile(user_id, (code, message, data) => {
            middleware.send_response(req, res, code, message, data);
        });
    })
});


//route for editing profile.
router.post('/editProfile', (req, res) => {
    middleware.decryption(req.body, (request) => {
        request.user_id = req.user_id;
        var rules = {

            first_name: "required",
            last_name: "required",
            email: "required",

        };

        var messages = {
            required: req.language.required_message
        };
        if (middleware.checkvalidationRule(request, res, rules, messages)) {
            auth.editProfile(request, (code, message, data) => {
                middleware.send_response(req, res, code, message, data);
            });
        }
    })
});

// define a route for chaning password.
router.post('/changePassword', (req, res) => {
    middleware.decryption(req.body, (request) => {


        request.user_id = req.user_id;
        var rules = {

            old_password: 'required',
            new_password: 'required'
        };
        var messages = {
            required: req.language.required_message
        };
        if (middleware.checkvalidationRule(request, res, rules, messages)) {
            auth.changePassword(request, (code, message, data) => {
                middleware.send_response(req, res, code, message, data);
            });
        }
    })
});

// define a route for adding new card. (customer)
router.post('/addNewCard', (req, res) => {
    middleware.decryption(req.body, (request) => {
        // var request = req.body;
        var user_id = req.user_id;

        var rules = {
            card_company_name: 'required|in:visa,mastercard,american_express,discover,jcb,union_pay',
            card_number: 'required|numeric',
            name_on_card: 'required|alpha',
            expiry_month: 'required|numeric',
            expiry_year: 'required|numeric',
            cvv: 'required|numeric|digits_between:3,3',


        }
        var messages = {
            required: req.language.rest_keywords_required_message,
            numeric: req.language.rest_keywords_numeric_message,
            in: req.language.rest_keywords_in_message,
            exists: req.language.rest_keywords_exists_message,
            'card_compnay_name.in': 'The selected card company is invalid. Only visa, mastercard, american_express, disocver, jcb, and union_pay are allowed.',
        }
        if (middleware.checkvalidationRule(request, res, rules, messages)) {
            auth.addNewCard(request, user_id, (code, message, data) => {
                middleware.send_response(req, res, code, message, data);
            });
        }
    })
})

// define a route for delting card. (customer)
router.post('/deleteCard', (req, res) => {
    middleware.decryption(req.body, (request) => {

        var user_id = req.user_id;
        auth.deleteCard(request, user_id, (code, message, data) => {
            middleware.send_response(req, res, code, message, data);
        });
    })
})

// define a route for getting notification list.
router.get('/getNotification', (req, res) => {
    middleware.decryption(req.body, (request) => {
        var user_id = req.user_id;
        auth.getNotification(user_id, (code, message, data) => {
            middleware.send_response(req, res, code, message, data);
        });
    });
});

// define a route for 1(first phase) complete profile.
router.post('/guide_profile', (req, res) => {
    middleware.decryption(req.body, (request) => {
        request.user_id = req.user_id;

        var rules = {
            // social_media_link: 'required|url',
            about: 'required|max:1000',
            // city: 'required',
            // country: 'required',
            id: 'required|numeric',
            latitude: 'required|numeric',
            longitude: 'required|numeric',
            // experience: 'required|numeric'
        };
        var messages = {
            // custom message for based rules
            required: req.language.keyword_required_message,
            max: req.language.keyword_max_number_message,
            // url: req.language.keyword_url_message,
            numeric: req.language.keyword_numeric_message
            //numeric: req.language.keyword_numeric_message
        };
        if (middleware.checkvalidationRule(request, res, rules, messages)) {
            auth.complateprofile(request, request.user_id, (code, message, data) => {
                middleware.send_response(req, res, code, message, data);
            });
        }

    });

});

// define a route for getting language.
router.post('/get_language', (req, res) => {
    middleware.decryption(req.body, (request) => {
        request.user_id = req.user_id;
        var rules = {
            page: 'required|numeric',
            limit: 'required|numeric'
        }
        var messages = {
            required: req.language.keyword_required_message,
            numeric: req.language.keyword_numeric_message
        }
        if (middleware.checkvalidationRule(request, res, rules, messages)) {
            auth.get_language(request, (code, message, data) => {
                middleware.send_response(req, res, code, message, data);
            });
        }
    });

});

// guide choose langugage
router.post('/add_language', (req, res) => {
    middleware.decryption(req.body, (request) => {
        var rules = {
            set_language: 'required'
        };
        var messages = {
            required: req.language.keyword_required_message,
        };
        if (middleware.checkvalidationRule(request, res, rules, messages)) {
            request.user_id = req.user_id;
            auth.guideaddlanguage(request, (code, message, data) => {
                middleware.send_response(req, res, code, message, data);
            });
        }
    });
});


// define a route for inserting region.
router.post('/insertRegion', (req, res) => {
    middleware.decryption(req.body, (request) => {
        var user_id = req.user_id;
        var rules = {
            search: 'required'
        };
        var messages = {
            required: req.language.keyword_required_message,
        };
        if (middleware.checkvalidationRule(request, res, rules, messages)) {
            auth.insertRegion(request, user_id, (code, message, data) => {
                middleware.send_response(req, res, code, message, data);
            });
        }
    });
});

//  guide choose expertise and list
router.get('/get_expertise', (req, res) => {
    var request = req.body;
    request.user_id = req.user_id;
    auth.activity(request, (code, message, data) => {
        middleware.send_response(req, res, code, message, data);
    })
});

// define a route for adding plan.
router.post('/addplan', (req, res) => {
    middleware.decryption(req.body, (request) => {
        var rules = {
            plan_id: 'required',
            expertise_id: 'required',
            plan_name: "required",
            price: "required",
            description: "required"
        };
        var messages = {
            required: req.language.keyword_required_message,
        };
        if (middleware.checkvalidationRule(request, res, rules, messages)) {

            request.user_id = req.user_id;
            auth.addplan(request, (code, message, data) => {
                middleware.send_response(req, res, code, message, data);
            });
        }
    });
});

// define a route for adding plan.
router.post('/editplan', (req, res) => {
    middleware.decryption(req.body, (request) => {
        var rules = {
            plan_id: 'required',
            expertise_id: 'required',
            price: "required",
            description: "required"
        };
        var messages = {
            required: req.language.keyword_required_message,
        };
        if (middleware.checkvalidationRule(request, res, rules, messages)) {

            request.user_id = req.user_id;
            auth.editplan(request, (code, message, data) => {
                middleware.send_response(req, res, code, message, data);
            });
        }
    });
});

// define a rotue for inserting expertise.
router.post('/setexpertise', (req, res) => {
    middleware.decryption(req.body, (request) => {
        let user_id = req.user_id
        let rules = {
            // expertise_id : "required",
            preference_data: "required"
        }
        let message = {
            required: req.language.rest_keywords_requires_message,
            numeric: req.language.rest_keywords_numeric_notvalid_message
        }
        if (middleware.checkvalidationRule(request, res, rules, message)) {
            auth.setexpertise(request, user_id, (code, message, data) => {
                middleware.send_response(req, res, code, message, data)
            })
        }
    })
})

// define a route for insertin availability.
router.post('/chosen_frequency', (req, res) => {
    middleware.decryption(req.body, (request) => {
        request.user_id = req.user_id;
        let rules = {
            date: 'required',
            start_time: 'required',
            end_time: 'required',
            chosen_frequency: 'required',
            week_day: (request.chosen_frequency == 'weekly') ? 'required' : ''
        };
        let message = {
            required: req.language.rest_keywords_requires_message,
        };
        if (middleware.checkvalidationRule(request, res, rules, message)) {
            auth.insertAvailability(request, (code, message, data) => {
                middleware.send_response(req, res, code, message, data)

            });
        }
    });
});

// define a route for getting Bank details.
router.get('/getBankDetails', (req, res) => {
    middleware.decryption(req.body, (request) => {
        request.user_id = req.user_id;
        auth.getBankDetails(request, (code, message, data) => {
            middleware.send_response(req, res, code, message, data)
        });

    });
});

// guide add bank details
router.post('/addbankdetails', (req, res) => {
    middleware.decryption(req.body, (request) => {
        console.log(request);
        let rules = {

            bank_name: 'required',
            account_holder_name: 'required',
            account_number: 'required',
            routing_number: 'required',
            state: 'required',
            city: 'required',
            postal_code: 'required',
            address: 'required',
            ssn_last: 'required',
            dob: 'required',
            mobile_number: 'required',
            country_code: 'required',
            country_id: 'required',

        };

        let message = {
            required: req.language.rest_keywords_requires_message,
            numeric: req.language.rest_keywords_numeric_message,
            alpha: req.language.rest_keywords_alpha_message
        };

        if (middleware.checkvalidationRule(request, res, rules, message)) {
            console.log("aaaaa",request)
            request.user_id = req.user_id;
            auth.create_bank_account(request, (code, message, data) => {
                middleware.send_response(req, res, code, message, data)

            });
        }
    });
});
// define a route for updating bank details.
router.post('/updateBankDetails', (req, res) => {
    middleware.decryption(req.body, (request) => {
        var user_id = req.user_id;
        let rules = {
            bank_name: "required",
            account_number: "required",
            account_holder_name: "required",
            ifsc_code: "required"
        };
        let message = {
            required: req.language.rest_keywords_requires_message,
            numeric: req.language.rest_keywords_numeric_message,
            alpha: req.language.rest_keywords_alpha_message
        };
        if (middleware.checkvalidationRule(request, res, rules, message)) {
            auth.updateBankDetails(request, user_id, (code, message, data) => {
                middleware.send_response(req, res, code, message, data)

            });
        }
    });
});

// define a route for getting guide profile.
router.get('/guideProfile', (req, res) => {
    middleware.decryption(req.body, (request) => {
        var user_id = req.user_id;
        auth.guideProfile(user_id, (code, message, data) => {
            middleware.send_response(req, res, code, message, data);
        });
    });
});

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
            auth.getRatingsAndReviews(request, user_id, (code, message, data) => {
                middleware.send_response(req, res, code, message, data);
            });
        }
    });
});

// define a route for updating guide language.
router.post('/update_language', (req, res) => {
    middleware.decryption(req.body, (request) => {
        var user_id = req.user_id;
        var rules = {
            language_id: 'required'
        };
        var messages = {
            required: req.language.keyword_required_message,
        };
        if (middleware.checkvalidationRule(request, res, rules, messages)) {
            auth.guideupdatelanguage(request, user_id, (code, message, data) => {
                middleware.send_response(req, res, code, message, data);
            });
        }
    });
});

// define a route for getting update availability.
router.get('/getupdate_avaiblity', (req, res) => {
    middleware.decryption(req.body, (request) => {
        request.user_id = req.user_id;
        auth.getupdateavaiblity(request, (code, message, data) => {
            middleware.send_response(req, res, code, message, data);
        })
    });
});

// define a route for updating availability
router.post('/update_avablity', (req, res) => {
    middleware.decryption(req.body, (request) => {
        request.user_id = req.user_id;
        var rules = {
            update_id: 'required',
            date: 'required',
            start_time: 'required',
            end_time: 'required',
            frequency: 'required',
            week_day: (request.chosen_frequency == 'weekly') ? 'required' : '',
        }
        var message = {
            required: req.language.keyword_required_message,
        }
        if (middleware.checkvalidationRule(request, res, rules, message)) {
            auth.updateAvailability(request, (code, message, data) => {
                middleware.send_response(req, res, code, message, data);
            });
        }
    });
});

// define a route for deleting availability
router.post('/delete_avaiblity', (req, res) => {

    middleware.decryption(req.body, (request) => {
        request.user_id = req.user_id;
        var rules = {
            delete_id: "required"
        }
        var message = {
            required: req.language.keyword_required_message,
        }
        if (middleware.checkvalidationRule(request, res, rules, message)) {
            auth.deleteavaiblity(request, (code, message, data) => {
                middleware.send_response(req, res, code, message, data);
            })
        }
    });
});

// define a route for getting data of slot.
router.post('/getSlotData', (req, res) => {
    middleware.decryption(req.body, (request) => {
        var user_id = req.user_id;
        var rules = {
            date: 'required',
        }
        var messages = {
            required: req.language.keyword_required_message,
        }
        if (middleware.checkvalidationRule(request, res, rules, messages)) {
            auth.getSlotData(request, user_id, (code, message, data) => {
                middleware.send_response(req, res, code, message, data);
            });
        }
    })
})


// define a route for deleting account.
router.post('/deleteAccount', (req, res) => {
    middleware.decryption(req.body, (request) => {
        var user_id = req.user_id;
        auth.deleteAccount(user_id, (code, message, data) => {
            middleware.send_response(req, res, code, message, data);
        });
    });
});

// define a route for updating `about me` section.
router.post('/updateAboutMe', (req, res) => {
    middleware.decryption(req.body, (request) => {
        var user_id = req.user_id;
        var rules = {
            about_me: 'required|max:1000',
            // about_me: 'required',
            // social_media_link: 'required|url',
            id: 'required|numeric',
            // latitude: 'required|numeric',
            // longitude: 'required|numeric',

            // experience: 'required|numeric'
        }
        var messages = {
            required: req.language.keyword_required_message,
            url: req.language.keyword_url_message,
            numeric: req.language.keyword_numeric_message,
            max: req.language.keyword_max_number_message
        }
        if (middleware.checkvalidationRule(request, res, rules, messages)) {
            auth.updateAboutMe(request, user_id, (code, message, data) => {
                middleware.send_response(req, res, code, message, data);
            });
        }
    })
})

// define a route for updating expertise.
router.post('/updateExpertise', (req, res) => {
    middleware.decryption(req.body, (request) => {
        var user_id = req.user_id;
        var rules = {
            activity_id: 'required',
        }
        var messages = {
            required: req.language.keyword_required_message,
        }
        if (middleware.checkvalidationRule(request, res, rules, messages)) {
            auth.updateExpertise(request, user_id, (code, message, data) => {
                middleware.send_response(req, res, code, message, data);
            });
        }
    })
})

// define a route for deleting expertise.
router.post('/deleteExpertise', (req, res) => {
    middleware.decryption(req.body, (request) => {
        var rules = {
            activity_id: 'required',
        }
        var messages = {
            required: req.language.keyword_required_message,
        }
        if (middleware.checkvalidationRule(request, res, rules, messages)) {
            request.user_id = req.user_id
            auth.deleteExpertise(request, (code, message, data) => {
                middleware.send_response(req, res, code, message, data);
            });
        }
    });
});

/* city state and coantry route*/

router.post('/getcitylist', (req, res) => {
    middleware.decryption(req.body, (request) => {
        request.user_id = req.user_id
        var rules = {

            state_id: 'required',
        }
        var messages = {
            required: req.language.keyword_required_message,
        }
        if (middleware.checkvalidationRule(request, res, rules, messages)) {
            auth.getcitylist(request, (code, message, data) => {
                middleware.send_response(req, res, code, message, data);
            });
        }
    });
});

router.post('/getstatelist', (req, res) => {
    console.log(req);
    middleware.decryption(req.body, (request) => {
        console.log(request);
        request.user_id = req.user_id
        var rules = {
            country_id: 'required',
        }
        var messages = {
            required: req.language.keyword_required_message,
        }
        if (middleware.checkvalidationRule(request, res, rules, messages)) {
            auth.getstatelist(request, (code, message, data) => {
                middleware.send_response(req, res, code, message, data);
            });
        }
    });
});

router.get('/getcountrylist', (req, res) => {
    middleware.decryption(req.body, (request) => {
        request.user_id = req.user_id;
        auth.getcountrylist(request, (code, message, data) => {
            middleware.send_response(req, res, code, message, data)

        });

    });
});



module.exports = router;
