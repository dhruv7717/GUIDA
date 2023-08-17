var Validator = require('Validator');
const { default: localizify } = require('localizify');
const en = require('../language/en');
const swi = require('../language/swi');
var { t } = require('localizify');
var con = require('../config/database');
var cryptolib = require('cryptlib');

var shakey = cryptolib.getHashSha256(process.env.KEY, 32)

/*==================================================================================================
        TOKEN bypass Method 
====================================================================================================*/
var bypassMethod = ['signup', 'login', 'uploadProfileImg', "forgotpassword", "reset", "resetpassword", "sendotp", "sendS3BucketCredentials", "findMyGuide", "insertRegion", "guideDetails", "getRatingsAndReviews", "seePlan", "upload_bank_image"]
var middleware = {

    // function for checking validation rules.
    checkvalidationRule: (request, res, rules, message) => {
        const v = Validator.make(request, rules, message);

        if (v.fails()) {
            const errors = v.getErrors();
            var error = ""
            for (var key in errors) {
                error = errors[key][0]
                break;
            }
            response_data = {
                code: '0',
                message: error,
            }
            // res.send(response_data);
            // return false
            middleware.encryption(response_data, (response) => {
                res.send(response);
                return false
            })
        }
        else {
            return true
        }
    },

    /*==================================================================================================
            For return send response Function 
    ====================================================================================================*/
    send_response: (req, res, code, message, data) => {

        middleware.getMessage(req.lang, message, (translated_message) => {
            if (data == null) {
                var response_data = {
                    code: code,
                    message: translated_message
                }
                middleware.encryption(response_data, (response) => {
                    res.status(200);
                    res.send(response);
                })
            }
            else {
                var response_data = {
                    code: code,
                    message: translated_message,
                    data: data
                }
                middleware.encryption(response_data, (response) => {
                    res.status(200);
                    res.send(response)
                })
            }
        })
    },

    // function for getting message in diff. languages.
    getMessage: (language, message, callback) => {
        localizify
            .add('en', en)
            .add('swi', swi)
            .setLocale(language);
        callback(t(message.keywords, message.content));

    },

    /*==================================================================================================
         Api Key Function
    ====================================================================================================*/

    validateApiKey: (req, res, callback) => {
        let end_point = req.path.split('/');
        let unique_end_point = new Array('signup', 'forgotpassword', 'reset', 'resetpassword', 'sendS3BucketCredentials');

        if (unique_end_point.includes(end_point[end_point.length - 2])) {
            callback();
        } else {
            let api_key = (req.headers['api-key'] != undefined && req.headers['api-key'] != '') ? req.headers['api-key'] : '';
            if (api_key != "") {
                var dec_apikey = cryptolib.decrypt(api_key, shakey, process.env.IV)
                if (dec_apikey != "" && dec_apikey == process.env.API_KEY) {
                    callback()
                } else {
                    var response_data = {
                        code: -1,
                        message: "Invalid Api Key"
                    }
                    middleware.encryption(response_data, (response) => {
                        res.status(401);
                        res.send(response);
                    })

                }
            } else {
                var response_data = {
                    code: -1,
                    message: "Invalid Api Key"
                }
                middleware.encryption(response_data, (response) => {
                    res.status(401);
                    res.send(response);
                })
            }
        }
    },

    /*==================================================================================================
     Api Key Function
====================================================================================================*/

    // function for validating header token.
    validateHeaderToken: (req, res, callback) => {
        let headerToken = (req.headers['token'] != undefined && req.headers['token'] != '') ? req.headers['token'] : '';
        var path_data = req.path.split('/');
        if (bypassMethod.indexOf(path_data[4]) === -1) {
            if (headerToken != "") {
                var dec_headertoken = cryptolib.decrypt(headerToken, shakey, process.env.IV)
                con.query("SELECT * FROM   tbl_user_deviceinfo WHERE token = ?", [dec_headertoken], (error, result) => {
                    if (!error && result.length > 0) {
                        req.user_id = result[0].user_id
                        callback();
                    } else {
                        var response_data = {
                            code: -1,
                            message: "Invalid Token"
                        }
                        middleware.encryption(response_data, (response) => {
                            res.status(401);
                            res.send(response);
                        })
                    }
                });
            } else {
                var response_data = {
                    code: -1,
                    message: "Invalid Token"
                }
                middleware.encryption(response_data, (response) => {
                    res.status(401);
                    res.send(response);
                })
            }
        } else {
            callback();
        }
    },

    // function for extracting header language.
    extractHeaderLanguage: (req, res, callback) => {
        var headerlang = (req.headers['accept-language'] != undefined && req.headers['accept-language'] != "") ? req.headers['accept-language'] : 'en';
        req.lang = headerlang
        req.language = headerlang == 'en' ? en : swi;

        callback()
    },

    // function for decryption.
    decryption: (encrypted_key, callback) => {
        if (encrypted_key != undefined && Object.keys(encrypted_key).length !== 0) {
            try {
                var request = JSON.parse(cryptolib.decrypt(encrypted_key, shakey, process.env.IV))
                callback(request)
            } catch (error) {
                callback({});
            }
        } else {
            callback({});
        }
    },

    // function for encryption.
    encryption: (response_data, callback) => {
        var response = cryptolib.encrypt(JSON.stringify(response_data), shakey, process.env.IV);
        callback(response)
    },

    // function for sending push notification, in chat
    pushNotification: (request,) => {
        sender_id = request.user_id,
            receiver_id = receiver_id,
            sender_type = sender_type,
            receiver_type = receiver_type,
            chat_room_id = request.chat_room.id,
            msg = t('push_chat_message', { field: response.messagedata.customer_name }),
            notification_tag = 'NewMessage',
            message_id = response.messagedata.id,
            title = 'New message from ' + response.messagedata.customer_name,
            status = 'New_message',
            add_notification = 1,
            chat_type = response.chat_room.chat_type,
            field = response.messagedata.customer_name
    }

}


module.exports = middleware;
