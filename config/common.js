var nodemailer = require('nodemailer');
var con = require('../config/database');
var globals = require('../config/constant');

var common = {

    /*==================================================================================================
            Send Email 
    ====================================================================================================*/
    sendEmail: (to_email, subject, message, callback) => {

        var transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            auth: {
                user: process.env.EMAIL_ID,
                pass: process.env.EMAIL_PASSWORD
            }
        });

        var mailOptions = {
            from: process.env.EMAIL_ID,
            to: to_email,
            subject: subject,
            html: message
        };
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                callback(false);
            } else {
                callback(true);
            }
        });
    },

    /*==================================================================================================
            OTP generator
    ====================================================================================================*/
    randomeOTPGenerator: () => {
        return Math.floor(1000 + Math.random() * 9000);
    },

    productCodeGenerator: function () {
        var randtoken = require('rand-token').generator();
        return productCode = randtoken.generate(12, '0123456789abcdefghijklmnopqrstuvwxyz');
    },

    /*==================================================================================================
            Token ==>
    ====================================================================================================*/
    checkUpdateToken: (user_id, request, callback) => {
        var randtoken = require('rand-token').generator();
        var usersession = randtoken.generate(64, '0123456789abcdefghijklmnopqrstuvwxyz');

        con.query(`SELECT * FROM tbl_user_deviceinfo WHERE user_id = ?`, [user_id], (error, result) => {
            if (!error && result.length > 0) {
                //update
                var deviceparams = {
                    device_token: (request.device_token != undefined) ? request.device_token : '0',
                    device_type: (request.device_type != undefined) ? request.device_type : 'A',
                    uuid: (request.uuid != undefined) ? request.uuid : ' ',
                    os_version: (request.os_version != undefined) ? request.os_version : ' ',
                    device_name: (request.device_name != undefined) ? request.device_name : ' ',
                    model_name: (request.model_name != undefined) ? request.model_name : ' ',
                    ip: (request.ip != undefined) ? request.ip : ' ',
                    api_version: (request.api_version != undefined) ? request.api_version : ' ',
                    app_version: (request.app_version != undefined) ? request.app_version : ' ',
                    token: usersession

                }
                con.query(`UPDATE tbl_user_deviceinfo SET ? WHERE user_id = ?`, [deviceparams, user_id], (error, result) => {

                    callback(usersession);
                });
            } else {
                //insert
                var deviceparams = {
                    device_token: (request.device_token != undefined) ? request.device_token : '0',
                    device_type: (request.device_type != undefined) ? request.device_type : 'A',
                    uuid: (request.uuid != undefined) ? request.uuid : ' ',
                    os_version: (request.os_version != undefined) ? request.os_version : ' ',
                    device_name: (request.device_name != undefined) ? request.device_name : ' ',
                    model_name: (request.model_name != undefined) ? request.model_name : ' ',
                    ip: (request.ip != undefined) ? request.ip : ' ',
                    api_version: (request.api_version != undefined) ? request.api_version : ' ',
                    app_version: (request.app_version != undefined) ? request.app_version : ' ',
                    token: usersession,
                    user_id: user_id
                }
                con.query(`INSERT INTO tbl_user_deviceinfo SET ?`, [deviceparams], (error, result) => {
                    callback(usersession);
                });
            }
        });
    },

    singleUpdate: function (tablename, params, condition, callback) {
        con.query("UPDATE " + tablename + " SET ? WHERE " + condition + " ", params, function (error, result, fields) {
            if (!error) {
                callback(result, error);
            } else {
                callback({}, error);
            }
        });
    },

    /*==================================================================================================
            get_setting_details function for book of guide
    ====================================================================================================*/

    get_setting_details(attribute_name, callback) {
        con.query("SELECT attribute_value FROM tbl_setting WHERE attribute_name='" + attribute_name + "'",
            function (err, result) {
                if (!err && result[0] != undefined) {
                    callback(result[0].attribute_value)
                } else {
                    callback('', t('no_data'), '2');
                }
            }); //end select query
    },

    /*==================================================================================================
            PUSH NOTIFICATION
    ====================================================================================================*/
    /*
    1) ===>  chat....
    2) ===>  payment for guide Booking....done ✔️(bookGuide);
    4) ===>  ratings & reviews.... done ✔️(ratingReviewDetails)
    5) ===>  summary request is pending....Done (finalizeSummaryRequest) 
    6) ===>  guide/user will receive notification when accpet /reject....done ✔️
    7) ===>  user will receive notification that guide has finalized summary...
    
    */
    /**
     * 
     * @param {*} push_data 
     * @param {*} params 
     */
    // <============> Reactnative Function For Push Notifiacton <============>

        send_notification(push_data, params) {
        //Android
        con.query(`SELECT * from tbl_user_deviceinfo where user_id=${params.receiver_id}`, function (error, device_data) {

            if (error) {
                console.log('While Sending Android Push:', error.sqlMessage)
            }
            else {
                if (device_data.length > 0) {
                    var notification_params = {
                        
                        action_id: params.action_id,
                        sender_id: params.sender_id,
                        receiver_id: params.receiver_id,
                        notification_tag: params.notification_tag,
                        message: params.message,
                        status:params.status,
                        sender_type: params.sender_type,
                        receiver_type:params.receiver_type,
                        title: params.title
                    }
                    common.delete('tbl_notification', 'action_id = ' + params.action_id + ' AND receiver_id = ' + params.receiver_id + ' AND notification_tag = "' + params.notification_tag + '"', function (delete_result) {
                        common.insert('tbl_notification', notification_params, function (insert_id) {

                        });
                    });

                    common.send_push(device_data[0].device_token, device_data[0].device_type, push_data);
                    //var android_devices = device_data.map(function (el) { return el.device_id; });
                    // asyncLoop(device_data, function (device, next) {
                    //     //Add notification
                    //     if (params.add_notification == 'Yes') {
                    //         var notification_params = {
                    //             reference_id: params.reference_id,
                    //             sender_id: params.sender_id,
                    //             receiver_id: params.receiver_id,
                    //             notification_type: params.notification_type,
                    //             message: params.message,
                    //         }
                    //         //Delete old message for the same 
                    //         CommonObj.delete('tbl_notification', 'reference_id = ' + params.reference_id + ' AND receiver_id = ' + params.receiver_id + ' AND notification_type = "' + params.notification_type + '"', function (delete_result) {
                    //             //Add notification
                    //             CommonObj.insert('tbl_notification', notification_params, function (insert_id) { });
                    //         });
                    //     }
                    //     next();
                    // }, function () {
                    //     //Send android notification
                    //     // if (device_data[0].notification == "Y")  ///////////// sir old project condition and in upper main query device_type A (remove)
                    //     // console.log('android_devices- ',android_devices);
                    //     // console.log('push_data- ',push_data);
                    //        CommonObj.send_push(android_devices, push_data);
                    // });
                }
                else {

                    //Add notification
                    if (params.add_notification == 'Yes') {
                        var notification_params = {
                            action_id: params.action_id,
                            sender_id: params.sender_id,
                            receiver_id: params.receiver_id,
                            notification_tag: params.notification_tag,
                            message: params.message,
                            status:params.status,
                            sender_type: params.sender_type,
                            receiver_type:params.receiver_type,
                        }

                        //Delete old message for the same 
                        common.delete('tbl_notification', { action_id: params.action_id, receiver_id: params.receiver_id, notification_tag: params.notification_tag }, function (delete_result, error) {
                            common.insert('tbl_notification', notification_params, function (insert_id) { });
                        });
                    }
                }
            }
        });
    },


    delete: function (tbl_name, params, callback) {
        // `delete from tbl_notifixatijx where action_id = ? and reciver_id = ? and notification_tag = ? `
        var sql = "delete from " + tbl_name + " where " + params;
        con.query(sql, function (error, delete_result) {
            if (error) {
                callback('Error executing the delete query:', error);
            } else {
                callback("Rows deleted");
            }
        });
    },
    insert: function (tbl_name, notification_params, callback) {
        con.query("INSERT INTO " + tbl_name + " SET ? ", [notification_params], function (error, insert_result) {
            if (error) {
                callback(null);

            } else {
                callback(insert_result);
            }
        });
    },

    /**
     * 
     * @param {GCM_PUSH_KEY} Using function 
     * @param {*} device_type 
     * @param {*} push_params 
     */

    send_push: function (registrationIds, device_type, push_params) {
        var FCM = require('fcm-node');
        var serverKey = process.env.GCM_PUSH_KEY;
        var fcm = new FCM(serverKey);

        var message = { //this may vary according to the message type (single recipient, multicast, topic, et cetera)
            to: registrationIds,
            collapse_key: process.env.bundle_id,
            notification: {
                title: globals.APP_NAME,
                body: push_params.custom.message.message
            },
            data: push_params.custom
        };

        if (device_type == "I") {
            message.notification.sound = "default";
        }

        fcm.send(message, function (err, response) {
            if (err) {
                console.log("Something has gone wrong!", err);
            } else {
                console.log('registrationIds----' ,registrationIds);
                console.log('device_type----' ,device_type);
                console.log("Successfully sent with response: ", response);
            }
        });
    },



}

module.exports = common;
