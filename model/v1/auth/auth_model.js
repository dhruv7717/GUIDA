const common = require('../../../config/common');
var con = require('../../../config/database');
var globals = require('../../../config/constant');
var middleware = require('../../../middleware/validation');
var asyncLoop = require('node-async-loop');
const e = require('express');
var config = require('../../../config/template');
var crypto = require('crypto');
const { request } = require('http');
const { truncate } = require('fs');
const { ifError } = require('assert');
var moment = require('moment');
const { use } = require('../user/route');
var Customstripe = require('../../../config/custome_stripe');
const multer = require('multer')
let bankstripe = require('stripe')(process.env.STRIPE_API_KEY);
var fs = require('fs');



var auth = {

    // expertiseByGuide function.
    expertiseByGuide: (user_id, callback) => {
        var sql = `SELECT e.*, CONCAT('${process.env.S3_BUCKET_ROOT}','activity/', e.activity_image) AS activity_image, gce.activity_id, e.name
                        FROM tbl_guide_chosen_expertise gce
                        JOIN tbl_expertise e ON e.id = gce.activity_id
                        WHERE gce.user_id = ${user_id};`
        con.query(sql, (err, result) => {
            if (!err && result.length > 0) {
                var expertise_data = result;
                callback("1", { keyword: 'success_message', content: {} }, expertise_data);
            } else {
                callback("0", { keyword: 'failed_to_get_expertise_data', content: {} }, {});
            }
        });
    },

    // guidePlanDetails function
    guidePlanDetails: (user_id, callback) => {
        var sql = `SELECT p.id, p.plan_name, p.price, p.description
             FROM tbl_plan p
             WHERE p.user_id = ${user_id};`;
        con.query(sql, (err, result) => {
            if (!err && result.length > 0) {
                var plan_data = result;
                callback("1", { keyword: 'success_message', content: {} }, plan_data);
            } else {
                callback("0", { keyword: 'failed_to_get_plan_data', content: {} }, {});
            }
        });
    },

    // function for fetcching guide rating details. 
    guideRatingDetails: (user_id, callback) => {
        var sqlRating = `SELECT r.id, r.user_id, r.rate, r.review
                                        FROM tbl_rating r
                                        JOIN tbl_user u ON u.id = r.user_id
                                        WHERE r.guide_id = ${user_id};`;
        con.query(sqlRating, (err, result) => {
            if (!err && result.length > 0) {
                var rating_data = result;
                callback("1", { keyword: 'success_message', content: {} }, rating_data);
            } else {
                callback("0", { keyword: 'failed_to_get_rating_data', content: {} }, {});
            }
        })
    },

    // function for checking email is exist or not.
    checkEmail: (request, callback) => {
        con.query('SELECT * FROM tbl_user WHERE email = ? AND is_delete = 0', [request.email], (error, result) => {
            if (!error && result.length > 0) {
                callback(true);
            } else {
                callback(false);
            }
        });
    },

    // function for checking password.
    checkpassword: (request, callback) => {
        con.query(`SELECT * FROM tbl_user WHERE password = "${request}" AND is_active = 1 AND is_delete = 0`, (error, result) => {
            if (!error && result.length > 0) {
                callback(true);
            } else {
                callback(false);
            }
        });
    },


    // function for getting user details.
    getUserDetails: (user_id, callback) => {
        con.query(`SELECT tu.id,tu.user_type,CONCAT('${process.env.S3_BUCKET_ROOT}','user/', tu.profile_image) AS profile_image,tu.first_name,tu.last_name,tu.country_code,tu.mobile_number,tu.email,tu.password,IFNULL(tud.token, '') AS token,IFNULL(tud.device_type, '') AS device_type,IFNULL(tud.device_token, '') AS device_token FROM tbl_user AS tu LEFT JOIN tbl_user_deviceinfo AS tud ON tu.id = tud.user_id WHERE tu.id = ?  AND tu.is_delete = '0'`, [user_id], (error, result) => {
            if (!error && result.length > 0) {
                callback(result[0])
            } else {
                callback(null)
            }
        })
    },

    // function for signup guide/user.
    signup: (request, callback) => {
        var encrypt_password;
        middleware.encryption(request.password, (response) => {
            encrypt_password = response;
        });
        var user_data = {
            user_type: request.user_type,
            first_name: request.first_name,
            last_name: request.last_name,
            email: request.email,
            password: encrypt_password,
            profile_image: (request.profile_image != undefined && request.profile_image != '') ? request.profile_image : "default.png",
            is_active: 1,
            approval_status: (request.user_type == 'user') ? 1 : 0
        };
        var sql = "INSERT INTO `tbl_user` SET ?";
        con.query(sql, [user_data], (err, result) => {
            if (!err) { 
                common.checkUpdateToken(result.insertId, request, (token) => {
                    var user_id = result.insertId;
                    auth.getUserDetails(user_id, (userDetails) => {
                        userDetails.token = token;
                        if (userDetails == null) {
                            callback("0", { keywords: 'user_details_not_found', content: {} }, null);
                        } else {
                            callback("1", { keywords: 'success_message', content: {} }, userDetails);
                        };
                    });
                });
            } else {
                callback("0", { keywords: 'failed_to_signup', content: {} }, null);
            };
        });
    },

    // function for sending otp.
    sendotp: (request, callback) => {
        if (request.type == 'signup') {
            auth.checkEmail(request, (is_exist) => {
                if (is_exist) {
                    callback('2', { keywords: "keyword_email_used_error", content: {} }, {})
                } else {
                    let otp = (globals.otp_sent) ? common.randomeOTPGenerator() : '1234';
                    let param = {
                        email: request.email,
                        otp: otp
                    }
                    common.sendEmail(request.email, 'OTP ', `<h1>Your signup code: ${otp}</h1>`, (isSend) => {
                        if (isSend) {
                            callback('1', { keywords: "keyword_otp_sent", content: {} }, param);
                        } else {
                            callback('0', { keywords: "keyword_otp_not_send", content: {} }, null);
                        }
                    })
                }
            })
        } else {
            auth.checkEmail(request, (isAvailable) => {
                if (isAvailable) {
                    let otp = (globals.otp_sent) ? common.randomeOTPGenerator() : '1234';
                    let param = {
                        email: request.email,
                        otp: otp
                    }
                    common.sendEmail(request.email, 'OTP ', `<h1>Your forgot password otp: ${otp}</h1>`, (isSend) => {
                        if (isSend) {
                            callback('1', { keywords: "keyword_otp_sent", content: {} }, param);
                        } else {
                            callback('0', { keywords: "keyword_otp_not_send", content: {} }, null);
                        }
                    })
                } else {
                    callback('2', { keywords: "keyword_email_not_found", content: {} }, null);
                }
            })
        }
    },

    // function for resending otp.
    resendotp: (request, callback) => {
        auth.checkEmail(request, (is_exist) => {
            if (is_exist) {
                let otp = (globals.otp_sent) ? common.randomeOTPGenerator() : '1234';
                common.sendEmail(request.email, 'OTP ', `<h1>Your otp code is: ${otp}</h1>`, (isSend) => {
                    if (isSend) {
                        callback('1', { keywords: "keyword_resend_otp", content: {} }, otp);
                    } else {
                        callback('0', { keywords: "keyword_otp_not_send", content: {} }, null);
                    }
                })
            } else {
                callback('2', { keywords: "data_not_found", content: {} }, null);
            }
        });
    },

    // function for reset password.
    resetpassword: (request, callback) => {
        let enc_password;
        middleware.encryption(request.new_password, (response) => {
            enc_password = response
        });

        con.query(`select * from tbl_user where email ='${request.email}'`, (error, result) => {
            if (!error && result.length > 0) {
                if (result[0].password == enc_password) {
                    callback("0", { keywords: 'rest_keywords_user_newold_password_similar', content: {} }, null);
                } else {
                    con.query(`UPDATE tbl_user SET password = '${enc_password}' WHERE email = '${request.email}' and is_delete = '0'`, (error, result) => {
                        if (!error) {
                            callback('1', { keywords: "keyword_password_change_success", content: {} }, {})
                        } else {
                            callback('2', { keywords: "data_not_found", content: {} }, null)
                        }
                    })
                }
            } else {
                callback('2', { keywords: "keyword_error", content: {} }, null)
            }
        });
    },

    // function for checking details.
    checkdetailsfunction: (id, callback) => {
        con.query(`SELECT u.*,CONCAT('${process.env.S3_BUCKET_ROOT}','user/', u.profile_image) as profile_image,gd.social_media_link,gd.about,gd.experience,cl.user_id as language_id,te.user_id as expertise_id,IFNULL(ud.token, '') as token, IFNULL(ud.device_type, '') as device_type, IFNULL(ud.device_token, '') as device_token FROM tbl_user u 
        LEFT JOIN tbl_guide_details gd on u.id = gd.user_id 
        LEFT JOIN tbl_guide_chosen_language as cl on u.id = cl.user_id 
        LEFT JOIN tbl_guide_chosen_expertise as te on u.id = te.user_id 
        LEFT JOIN tbl_user_deviceinfo ud ON u.id = ud.user_id 
        WHERE u.id = ${id}  AND u.is_delete = '0';`, (error, result) => {
            if (!error && result.length > 0) {
                callback(result[0]);
            } else {
                callback(null);
            }
        })
    },

    // function for login guide/user.
    login: (request, callback) => {
        var enc_password;
        middleware.encryption(request.password, (response) => {
            enc_password = response;
        });
        con.query(`SELECT * FROM tbl_user WHERE email = "${request.email}" AND password = "${enc_password}" and is_delete = '0'`, (error, result) => {
            if (!error && result.length > 0) {
                if (result[0].user_type == "guide") {
                    if (result[0].is_active == '1') {
                        var updatedata = {
                            login_status: "1",
                            last_login: moment().format('YYYY-MM-DD HH:mm:ss'),
                        };
                        con.query(`UPDATE tbl_user SET ? WHERE id = ${result[0].id}`, updatedata, (error, result) => { });
                        auth.checkdetailsfunction(result[0].id, (response) => {

                            common.checkUpdateToken(result[0].id, request, (token) => {
                                response.token = token;
                                if (response.about == '' || response.about == null || response.about == undefined) {
                                    callback('11', { keywords: "keyword_redirect_about1_us", content: {} }, { token: token });
                                }
                                // else if (response.social_media_link == '' || response.social_media_link == null || response.social_media_link == undefined) {
                                // callback('12', { keywords: "keyword_redirect_about2_us", content: {} }, { token: token });
                                // } else if (response.experience == '' || response.experience == null || response.experience == undefined) {
                                //     callback('13', { keywords: "keyword_redirect_about3_us", content: {} }, null);
                                // } else if (response.city == '' || response.city == null || response.city == undefined) {
                                //     callback('14', { keywords: "keyword_redirect_about4_us", content: {} }, { token: token });
                                // }
                                else if (response.language_id == '' || response.language_id == null || response.language_id == undefined) {
                                    callback('15', { keywords: "keyword_redirect_language", content: {} }, { token: token });
                                } else if (response.expertise_id == '' || response.expertise_id == null || response.expertise_id == undefined) {
                                    callback('16', { keywords: "keyword_redirect_expertise", content: {} }, { token: token });
                                    // } else if (response.activity_id == '' || response.activity_id == null || response.activity_id == undefined) {
                                    //     callback('17', { keywords: "keyword_redirect_activity", content: {} }, { token: token });
                                    // } else if (response.bank_id == '' || response.bank_id == null || response.bank_id == undefined) {
                                    //     callback('18', { keywords: "keyword_redirect_bank", content: {} }, null);
                                } else {
                                    if (response.approval_status == '1') {
                                        callback('1', { keywords: "Login Success", content: {} }, response);
                                    } else if (response.approval_status == '2') {
                                        callback('19', { keywords: "Login_requst_rejacted", content: {} }, null);
                                    } else {
                                        callback('20', { keywords: "login_not_accepted", content: {} }, null);
                                    }
                                }
                            });
                        });
                    } else if (result[0].is_active == '0') {
                        callback('3', { keywords: "text_login_inactive", content: {} }, null);
                    } else {
                        callback('0', { keywords: "something_went_wrong", content: {} }, null);
                    }
                } else if (result[0].user_type == "user") {
                    if (result[0].is_active == '1') {
                        var updatedata = {
                            login_status: "1",
                            last_login: moment().format('YYYY-MM-DD HH:mm:ss'),
                        };
                        con.query(`UPDATE tbl_user SET ? WHERE id = ${result[0].id}`, updatedata, (error, result) => { });
                        common.checkUpdateToken(result[0].id, request, () => {
                            auth.checkdetailsfunction(result[0].id, (response) => {
                                if (response == null) {
                                    callback("0", { keywords: 'user_details_not_found', content: {} }, null);
                                } else {
                                    callback('1', { keywords: "keyword_login_success", content: {} }, response);
                                }
                            });
                        });
                    } else if (result[0].is_active == '0') {
                        callback('3', { keywords: "text_login_inactive", content: {} }, null);
                    } else {
                        callback('0', { keywords: "something_went_wrong", content: {} }, null);
                    }
                } else {
                    callback('0', { keywords: "invalid_user_type", content: {} }, null);
                }

            } else {
                callback('0', { keywords: "invalid_credentials", content: {} }, null);
            }
        });
    },

    // function for completing profile of guide.
    complateprofile: (request, user_id, callback) => {
        var user_data = {
            user_id: user_id,
            // social_media_link: request.social_media_link,
            about: request.about,
            // experience: request.experience,
        }

        if (request.social_media_link != undefined && request.social_media_link != null) {
            user_data.social_media_link = request.social_media_link
        }

        var sql = "INSERT INTO tbl_guide_details set ?"
        con.query(sql, [user_data], (err, result) => {
            if (!err) {
                var anotherData = {
                    region_id: request.id,
                    latitude: (request.latitude != undefined) ? request.latitude : '00.00',
                    longitude: (request.longitude != undefined) ? request.longitude : '00.00',
                }
                var sql = `UPDATE tbl_user SET ? WHERE id = ${user_id}`
                con.query(sql, [anotherData], (err, result) => {
                    if (!err) {
                        var sql = `SELECT u.id, u.region_id, u.latitude, u.longitude, gd.social_media_link, gd.about,
                                    (SELECT l.address FROM tbl_location l WHERE l.id = u.region_id LIMIT 1) AS Address
                                FROM tbl_user u
                                JOIN tbl_guide_details gd ON u.id = gd.user_id
                                WHERE u.id = ${user_id};`
                        con.query(sql, (error, result) => {
                            if (!error) {
                                callback('1', { keywords: "success_message", content: {} }, result)
                            } else {
                                callback('0', { keywords: "error_fetching_updated_details", content: {} }, null)
                            }
                        });
                    } else {
                        callback('0', { keywords: "error_fetching_guide_details", content: {} }, null)
                    }
                });
            } else {
                callback('0', { keywords: "error_inserting_profile", content: {} }, null)
            }
        });
    },

    // function for getting guide details.
    getguidedetails: (id, callback) => {
        con.query("SELECT gd.id,gd.social_media_link,gd.about FROM tbl_guide_details as gd WHERE gd.id = ? AND gd.is_active = 1 AND gd.is_delete = 0", [id], (error, result) => {
            if (!error) {
                callback(result[0]);
            } else {
                callback(null);
            }
        })
    },

    // function for inserting region.
    insertRegion: (request, user_id, callback) => {
        // var user_data = {
        //     country: request.country,
        //     city: request.city,
        //     latitude: (request.latitude != undefined) ? request.latitude : "00.00",
        //     longitude: (request.longitude != undefined) ? request.longitude : "00.00"
        // };
        const searchSql = `SELECT * FROM tbl_location WHERE address LIKE '%${request.search}%' AND is_active = '1' AND is_delete = '0';`
        con.query(searchSql, (err, result) => {
            if (!err && result.length > 0) {
                callback('1', { keywords: 'success_message', content: {} }, result);
            } else {
                callback('0', { keywords: 'error_getting_location_data', content: {} }, null);
            }
        })
    },

    // function for getting inserted region.
    getinsertregion: (user_id, callback) => {
        con.query(`select u.* from tbl_user as u where u.id = ? and u.is_delete = 0`, [user_id], (error, result) => {
            if (!error && result.length > 0) {
                callback(result);
            } else {
                callback(null);
            }
        });
    },

    // function for getting language data.
    get_language: (request, callback) => {
        var sql = `SELECT tl.id,CONCAT('${process.env.S3_BUCKET_ROOT}','flag/', tl.image) AS language_image,tl.name,
        (select COUNT(*) FROM tbl_guide_chosen_language where user_id=${request.user_id} AND is_active = '1' AND is_delete = '0' AND language_id=tl.id) as is_selected 
        FROM tbl_language as tl WHERE tl.is_delete = '0' limit ${request.limit} offset ${(request.page - 1) * request.limit}`
        con.query(sql, (error, result) => {
            if (!error && result.length > 0) {
                callback('1', { keywords: 'keyword_get_language', content: {} }, result);
            } else {
                callback('0', { keywords: 'failed_to_get_language_data', content: {} }, null);
            }
        });
    },

    // function for getting guide added language.
    guideaddlanguage: (request, callback) => {
        asyncLoop(request.set_language, (item, next) => {
            let language_data = {
                user_id: request.user_id,
                language_id: item,
                is_active: '1',
            }
            con.query(`INSERT INTO tbl_guide_chosen_language SET ?`, [language_data], (err, result) => {
                if (!err) {
                    next()
                } else {
                    next()
                }
            });

        }, () => {
            auth.get_known_language(request.user_id, (getlanguage) => {
                if (getlanguage == null) {
                    callback('0', { keywords: 'failed_to_add_known_language', content: {} }, null);
                } else {
                    callback('1', { keywords: 'success_message', content: {} }, getlanguage);
                }
            });
        });
    },

    // function for getting language.
    get_known_language: (id, callback) => {
        var sql = `SELECT tgl.id,tgl.language_id as Language_id, tl.name as Language_name FROM tbl_guide_chosen_language as tgl JOIN tbl_language as tl on tgl.language_id = tl.id WHERE 	tgl.user_id = ${id} AND tgl.is_active = '1' AND tgl.is_delete = '0'`
        con.query(sql, (err, result) => {
            if (!err) {
                callback(result);
            } else {
                callback(null);
            }
        });
    },

    // function for listing all the activities/expertise.
    activity: (request, callback) => {
        con.query(`SELECT te.*, CONCAT('${process.env.S3_BUCKET_ROOT}','activity/', te.activity_image) AS activity_image, te.id,te.activity FROM tbl_expertise as te WHERE te.parent_id = 0 AND te.is_delete = 0`, (error, result) => {
            if (!error && result.length > 0) {
                asyncLoop(result, (item, next) => {
                    var plan_params = {
                        user_id: request.user_id,
                        expertise_id: item.id
                    }
                    auth.planDetails(plan_params, (plan_data) => {
                        item.plan_data = plan_data;

                        auth.selectedExpertiseById(plan_params, (selected_expertise) => {
                            item.selected_expertise = selected_expertise;

                            con.query(`SELECT te.*,(SELECT count(*) FROM tbl_guide_chosen_expertise as tge WHERE tge.user_id = ${request.user_id} and tge.activity_id = te.id) as is_selected FROM tbl_expertise as te WHERE te.parent_id = "${item.id}" AND te.is_delete = 0`, (error, subcategoryResult) => {
                                if (!error && subcategoryResult.length > 0) {
                                    item.subcategories = subcategoryResult;
                                    next();
                                } else {
                                    item.subcategories = [];
                                    next();
                                }
                            });
                        });
                    });
                }, () => {
                    callback('1', { keywords: "keyword_list_success", content: {} }, result);
                });
            } else {
                callback('0', { keywords: "failed_to_get_expertise_data", content: {} }, null);
            }
        });
    },

    // function for fetching plan details.
    planDetails: (request, callback) => {
        var sqlPlan = `SELECT p.id,p.plan_name,ifnull((select price from tbl_plan where plan_id=p.id and user_id=${request.user_id} AND expertise_id = ${request.expertise_id} AND plan_id=p.id),'') as price,(select description from tbl_plan where user_id=${request.user_id} AND expertise_id = ${request.expertise_id} AND plan_id=p.id) as description FROM tbl_user_plans p WHERE p.is_active='1' AND is_delete='0';`;

        con.query(sqlPlan, (err, result) => {
            if (!err && result.length > 0) {
                var plan_data = result;
                callback(plan_data);
            } else {
                callback([]);
            }
        });
    },

    // function for fetching plan details.
    selectedExpertiseById: (request, callback) => {
        var sqlPlan = `SELECT tge.id,tge.user_id,tge.activity_id,te.activity,te.parent_id as main_expertise_id 
        FROM tbl_guide_chosen_expertise as tge 
        JOIN tbl_expertise as te on tge.activity_id = te.id WHERE tge.user_id = ${request.user_id} and te.parent_id = ${request.expertise_id} AND tge.is_active='1' AND tge.is_delete='0'`;

        con.query(sqlPlan, (err, result) => {
            if (!err && result.length > 0) {
                callback(result);
            } else {
                callback([]);
            }
        });
    },

    // function for inserting expertise.
    setexpertise: (request, user_id, callback) => {
        let insertIds = [];
        asyncLoop(request.preference_data, (item, next) => {
            let preferenceObj = {
                user_id: user_id,
                // expertise_id: request.expertise_id,
                activity_id: item.activity_id
            };
            con.query(`INSERT INTO tbl_guide_chosen_expertise SET ?`, [preferenceObj], (error, result) => {
                if (!error && result.affectedRows != 0) {
                    insertIds.push(result.insertId);
                    next();
                } else {
                    next();
                }
            });
        }, (error) => {
            if (error) {
                callback('0', { keywords: "keywords_expertise_err_message", content: {} }, {});
            } else {
                auth.get_expertise(insertIds, (preferenceData) => {
                    if (preferenceData == null) {
                        callback('0', { keywords: "rest_keywords_expertise_data_empty_message", content: {} }, null);
                    } else {
                        callback('1', { keywords: "rest_keywords_set_expertise_succ_message", content: {} }, preferenceData);
                    }
                });
            }
        });
    },

    // function for getting expertise data.
    get_expertise: (id, callback) => {
        var sql = `SELECT tge.id,tge.user_id,tge.activity_id,te.activity 
        FROM tbl_guide_chosen_expertise as tge 
        JOIN tbl_expertise as te on tge.activity_id = te.id WHERE tge.id IN (${id})`

        con.query(sql, (err, result) => {
            if (!err && result.length > 0) {
                callback(result);
            } else {
                callback(null);
            }
        });
    },

    // function for adding plan
    addplan: (request, callback) => {
        let addplan = {
            plan_id: request.plan_id,
            expertise_id: request.expertise_id,
            user_id: request.user_id,
            plan_name: request.plan_name,
            price: request.price,
            description: request.description
        }
        con.query('INSERT INTO tbl_plan SET ?', [addplan], (error, result) => {
            if (!error) {
                auth.getplanfunction(result.insertId, (getplan) => {
                    if (getplan == null) {
                        callback('0', { keywords: 'keyword_error_get_plan', content: {} }, null);
                    } else {
                        callback('1', { keywords: 'rest_keywords_add_plan', content: {} }, getplan);
                    }
                });
            } else {
                callback('0', { keywords: 'keyword_add_plan_error', content: {} }, null);
            };
        });
    },

    // function for edit plan
    editplan: (request, callback) => {
        let editplan = {
            price: request.price,
            description: request.description
        }
        con.query(`UPDATE tbl_plan SET ? where plan_id=${request.plan_id} AND expertise_id=${request.expertise_id} AND user_id=${request.user_id}`, [editplan], (error, result) => {
            if (!error) {
                callback('1', { keywords: 'rest_keywords_add_plan', content: {} }, true);
            } else {
                callback('0', { keywords: 'keyword_add_plan_error', content: {} }, null);
            };
        });
    },

    // function for geting plan data.
    getplanfunction: (id, callback) => {
        con.query(`SELECT * FROM tbl_plan WHERE id = ${id} AND is_delete = "0"`, (error, result) => {
            if (!error) {
                callback(result[0]);
            } else {
                callback(null);
            }
        });
    },

    // functoin for updating logina and status time.
    updateLoginStatusAndTime: (user_id, callback) => {
        var last_login = new Date();
        var sql = "UPDATE tbl_user SET login_status = '1', last_login = ? WHERE id = ?";
        con.query(sql, [last_login, user_id], (err, result) => {
            if (!err) {
                callback(true);
            } else {
                callback(false);
            }
        });
    },

    // functoin for logging out user.
    logoutUser: (user_id, callback) => {
        var sql = "UPDATE tbl_user_deviceinfo SET token = '', device_token = '' WHERE user_id = ?";
        con.query(sql, [user_id], (err, result) => {
            if (!err) {
                auth.updateLoginStatus(user_id, (isUpdate) => {
                    if (isUpdate) {
                        callback("1", { keywords: 'keywords_logout_success_message', content: {} }, {});
                    } else {
                        callback("0", { keywords: 'keywords_updateloginstatus_error_message', content: {} }, null);
                    }
                });
            } else {
                callback("0", { keywords: 'keyword_somthing_error', content: {} }, null);
            }
        });
    },

    // function for updating login status.
    updateLoginStatus: (user_id, callback) => {
        var sql = "UPDATE tbl_user SET login_status = '0' WHERE id = ?";
        con.query(sql, [user_id], (err, result) => {
            if (!err) {
                callback(true);
            } else {
                callback(false);
            }
        });
    },

    // function for getting user profile.
    customerProfile: (user_id, callback) => {
        var sql = `SELECT u.id, u.language, CONCAT(u.first_name, ' ' , u.last_name) AS Name, u.email, u.mobile_number, CONCAT('${process.env.S3_BUCKET_ROOT}','user/', tu.profile_image) as img_url 
            FROM tbl_user u
            WHERE u.id = ${user_id} AND u.user_type = 'user' AND u.is_active = '1' AND u.is_delete = '0'`;
        con.query(sql, (err, result) => {
            if (!err && result.length > 0) {
                var user_data = result;
                callback("1", { keywords: 'success_message', content: {} }, user_data);
            }
            else {
                callback("0", { keywords: 'failed_to_get_customer_profile', content: {} }, {});
            }
        });
    },

    // function for inserting availability.
    insertAvailability: (request, callback) => {
        auth.checkTime(request, (is_true) => {
            if (is_true) {
                callback('0', { keywords: "sloat_already_booked", content: {} }, null);
            } else {
                var values = {
                    user_id: request.user_id,
                    available_date: request.date,
                    week_day: (request.week_day) ? (request.week_day) : null,
                    start_time: moment(request.start_time, 'hh:mm A').format('HH:mm'),
                    end_time: moment(request.end_time, 'hh:mm A').format('HH:mm'),
                    chosen_frequency: request.chosen_frequency
                };

                if (request.chosen_frequency === 'weekly') {
                    values.week_day = request.week_day
                }

                var sql = `INSERT INTO tbl_availability SET ? `;
                con.query(sql, [values], (error, result) => {
                    if (!error) {
                        var slot_id = result.insertId;
                        auth.getInsertedSlot(slot_id, (bookslot) => {
                            if (bookslot == null) {
                                callback('0', { keywords: "keyword_get_slot_error", content: {} }, null);
                            } else {
                                callback('1', { keywords: "set_slot_done", content: {} }, bookslot);
                            }
                        })
                    } else {
                        callback('0', { keywords: "slote_not_done", content: {} }, null);
                    }
                });
            }
        });
    },

    checkTime: (request, callback) => {
        // var sql = `SELECT * FROM tbl_availability WHERE user_id = ${request.user_id} AND available_date = '${request.date}' AND ((start_time = '${request.start_time}' AND end_time = '${request.end_time}') OR (start_time >= '${request.start_time}' AND end_time <= '${request.end_time}') OR (end_time >= '${request.start_time}' AND start_time <= '${request.end_time}')) AND is_active = '1' AND is_delete ='0'`;
        var sql = `SELECT * FROM tbl_availability 
                WHERE user_id = ${request.user_id} 
                    AND available_date = '${request.date}' 
                    AND (
                        (start_time BETWEEN '${request.start_time}' AND '${request.end_time}')
                        OR (end_time BETWEEN '${request.start_time}' AND '${request.end_time}')
                        OR ('${request.start_time}' BETWEEN start_time AND end_time)
                        OR ('${request.end_time}' BETWEEN start_time AND end_time)
                    ) 
                    AND is_active = '1' 
                    AND is_delete = '0'`
        con.query(sql, (err, result) => {
            if (!err && result.length > 0) {
                callback(true);
            } else {
                callback(false);
            }
        });
    },


    getInsertedSlot: (slot_id, callback) => {
        con.query(`SELECT * FROM tbl_availability where id = ${slot_id} AND is_active = '1' AND is_delete = '0'`, (error, result) => {
            if (!error && result.length > 0) {
                callback(result);
            } else {
                callback(null)
            }
        });
    },



    // create bank details :

    // function for adding bank details.
    /**
     * creat bank using stripe method :-
     * 20/07/23
     * @param {crad obj} req 
     * @param {Function} callback 
     */

    checkaccountnumber: (request, callback) => {
        con.query('SELECT * FROM tbl_bank_details WHERE account_number = ? AND is_active = 1 AND is_delete = 0', [request.account_number], (error, result) => {
            if (!error && result.length > 0) {
                callback(true);
            } else {
                callback(false);
            }
        });
    },


    BankDetails: function (id, callback) {
        con.query(`select * from tbl_bank_details where user_id = ${id} and is_active ='1' and is_delete = '0'`, (error, result) => {
            if (!error && result.length > 0) {
                callback(result[0])
            } else {
                callback(null)
            }
        })
    },

    // getcountrylist: function (request, callback) {
    //     con.query(`select id,country,flag,nationality,sortname,currency,currency_name,country_code from tbl_country where is_active ='1' and is_deleted = '0'`, (error, result) => {
    //         if (!error && result.length > 0) {
    //             callback('1', { keywords: 'list success', content: {} }, result);
    //         } else {
    //             callback('0', { keywords: 'error', content: {} }, null);
    //         }
    //     });
    // },

    // done bannk
    // create_bank_account: (request, callback) => {
    //     auth.checkaccountnumber(request, (is_exist) => {
    //         if (is_exist) {
    //             auth.BankDetails(request.user_id, function (bankDetails) {
    //                 const stripeAccountId = bankDetails.merchant_account_id;
    //                 // Replace this with the actual field name for the Stripe Account ID
    //                 // Update the bank account details using the Stripe API
    //                 var fp = fs.readFileSync('./' + globals.BANK_IMAGE + request.bank_image);
    //                 var file = {};
    //                 bankstripe.accounts.update(
    //                     stripeAccountId,
    //                     bankstripe.files.create({
    //                         purpose: 'identity_document',
    //                         file: {
    //                             data: fp,
    //                             name: request.bank_image,
    //                             type: 'application/GUIDA'
    //                         }
    //                     }),
    //                     {
    //                         external_account: {
    //                             object: 'bank_account',
    //                             // Add the updated bank account details here
    //                             account_holder_name: request.account_holder_name,
    //                             account_number: request.account_number,
    //                             routing_number: request.routing_number,
    //                             country: 'US'
    //                             // You can add other fields as needed for updating bank details
    //                         },
    //                     },
    //                     function (err, updatedAccount) {
    //                         if (err && updatedAccount != undefined) {
    //                             callback(0, { keywords: err.message, content: {} }, null);
    //                         } else {
    //                             // Update the bank details in your database with the new data
    //                             const updatedBankDetails = {
                                
    //                                 bank_name: request.bank_name,
    //                                 account_holder_name: request.account_holder_name,
    //                                 account_number: request.account_number,
    //                                 routing_number: request.routing_number,
    //                                 state: request.state,
    //                                 city: request.city,
    //                                 postal_code: request.postal_code,
    //                                 address: request.address,
    //                                 ssn_last: (request.ssn_last != undefined) ? request.ssn_last.slice(-4) : '',
    //                                 country_id: request.country_id,
    //                                 dob: request.dob,
    //                                 mobile: request.mobile_number,
    //                                 country_code: request.country_code,
    //                                 bank_documnet:request.bank_image,
    //                                 // Add other fields as needed for your database update
    //                             };

    //                             con.query(`UPDATE tbl_bank_details SET ? WHERE user_id = ${request.user_id}`, [updatedBankDetails], function (err, updateResult) {
    //                                 if (err) {
    //                                     callback(0, { keywords: "key_something_wrong", content: {} }, null);
    //                                 } else {
    //                                     auth.BankDetails(request.user_id, function (bank_details) {
    //                                         if (bank_details == null) {
    //                                             callback(3, { keywords: "data_not_found", content: {} }, null);
    //                                         } else {
    //                                             callback(1, { keywords: "text_bank_update_success", content: {} }, bank_details);
    //                                         }
    //                                     })
    //                                 }
    //                             });
    //                         }
    //                     }
    //                 );
    //             })
    //         } else {
    //             con.query(`select u.id,CONCAT(u.first_name,' ',u.last_name) as name,u.email,u.country_code,u.mobile_number,c.country as country_name,c.sortname as code,c.currency from tbl_user u LEFT JOIN tbl_country c ON c.id = ${request.country_id} where u.id= ${request.user_id} AND u.is_active='1' AND c.is_deleted='0'`, function (err, result) {
    //                 if (!err) {
    //                     var getdob = request.dob.split("-");
    //                     var d_year = getdob[0];
    //                     var d_month = getdob[1];
    //                     var d_day = getdob[2];

    //                     var ssn_last_4 = Math.floor(1000 + Math.random() * 9000); //rand(1000,9999)
    //                     var fp = fs.readFileSync('./' + globals.BANK_IMAGE + request.bank_image);
    //                     var file = {};
    //                     bankstripe.files.create({
    //                         purpose: 'identity_document',
    //                         file: {
    //                             data: fp,
    //                             name: request.bank_image,
    //                             type: 'application/GUIDA'
    //                         }
    //                     }, function (err, fileUpload) {
    //                         file = fileUpload;
    //                         var account_data = {
    //                             type: 'custom',
    //                             country: result[0].code,
    //                             email: result[0].email,
    //                             business_type: 'individual',
    //                             requested_capabilities: ['card_payments', 'transfers'],
    //                             business_profile: {
    //                                 mcc: '5965',
    //                                 name: result[0].name,
    //                                 // url: "www.guida.com",
    //                                 product_description: "",
    //                             },
    //                             individual: {
    //                                 address: {
    //                                     state: request.state,
    //                                     city: request.city,
    //                                     postal_code: request.postal_code,
    //                                     line1: request.address,
    //                                 },
    //                                 dob: {
    //                                     day: d_day,
    //                                     month: d_month,
    //                                     year: d_year,
    //                                 },
    //                                 id_number: request.ssn_last,
    //                                 email: result[0].email,
    //                                 first_name: result[0].first_name,
    //                                 last_name: 'Ealiox',
    //                                 phone: request.mobile_number,
    //                                 // country_code :result[0].country_code,

    //                                 verification: {
    //                                     document: {
    //                                         front: file.id
    //                                     },

    //                                     additional_document: {
    //                                         front: file.id
    //                                     },
    //                                 },
    //                             },
    //                             tos_acceptance: {
    //                                 date: Math.floor(Date.now() / 1000),
    //                                 ip: '192.168.1.132',
    //                             },
    //                             external_account: {
    //                                 // user_id: request.user_id,
    //                                 object: 'bank_account',
    //                                 // country: 'United state ',
    //                                 country: result[0].code,
    //                                 currency: result[0].currency,
    //                                 bank_name: request.bank_name,
    //                                 account_holder_name: request.account_holder_name,
    //                                 account_number: request.account_number,
    //                                 routing_number: request.routing_number,
    //                             }
    //                         };
    //                         bankstripe.accounts.create(account_data, function (errs, bankresult) {
    //                             if (!errs && bankresult != undefined) {
    //                                 var bankobj = {
    //                                     user_id: request.user_id,
    //                                     bank_name: request.bank_name,
    //                                     account_holder_name: request.account_holder_name,
    //                                     account_number: request.account_number,
    //                                     routing_number: request.routing_number,
    //                                     ssn_last: (request.ssn_last != undefined) ? request.ssn_last.slice(-4) : '',
    //                                     address: bankresult.individual.address.line1,
    //                                     state: bankresult.company.address.state,
    //                                     city: bankresult.company.address.city,
    //                                     country: result[0].code,
    //                                     postal_code: request.postal_code,
    //                                     bank_documnet: request.bank_image,
    //                                     mobile: request.mobile_number,
    //                                     dob: request.dob,
    //                                     country_code: result[0].country_code,
    //                                     country_id: request.country_id,
    //                                     merchant_account_id: bankresult.id,
    //                                     bank_token: bankresult.external_accounts.data[0].id,
    //                                     bank_payout_token: bankresult.external_accounts.data[0].id,
    //                                 };
    //                                 con.query(`insert into tbl_bank_details set ?`, [bankobj], function (err, addresult) {
    //                                     if (!err) {
    //                                         var id = addresult.insertId;
    //                                         auth.BankDetails(request.user_id, function (bank_details) {
    //                                             if (bank_details == null) {
    //                                                 callback(3, { keywords: "data_not_found", content: {} }, null);
    //                                             } else {
    //                                                 callback(1, { keywords: "text_bank_create_success", content: {} }, bank_details);
    //                                             }
    //                                         });
    //                                     } else {
    //                                         callback(3, { keywords: "data_not_found", content: {} }, null);
    //                                     }
    //                                 });
    //                             } else {
    //                                 callback(0, { keywords: errs.message, content: {} }, null);
    //                             }
    //                         });

    //                     });
    //                 } else {
    //                     callback(0, { keywords: "key_something_wrong", content: {} }, null);
    //                 }
    //             });
    //         }
    //     });
    // },

    getcountrylist: function (request, callback) {
        con.query(`select id,name as country,short_name as sortname,currency,currency_name,dial_code as country_code from tbl_countries where status = '1' ORDER BY name ASC`, (error, result) => {
            if (!error && result.length > 0) {
                callback('1', { keywords: 'list success', content: {} }, result);
            } else {
                callback('2', { keywords: 'keyword_data_error', content: {} }, null);
            }
        });
    },

    getstatelist: function (request, callback) {
        con.query(`SELECT id as state_id, name, country_id, country_code FROM tbl_states WHERE status = '1' AND country_id = ${request.country_id} ORDER BY name ASC`, (error, result) => {
            if (!error && result.length > 0) {
                callback('1', { keywords: 'list success', content: {} }, result);
            } else {
                callback('2', { keywords: 'keyword_data_error', content: {} }, null);
            }
        });
    },

    getcitylist: function (request, callback) {
        con.query(`select id as city_id,name,state_id from tbl_cities where state_id = ${request.state_id} and status ='1' ORDER BY name ASC`, (error, result) => {
            if (!error && result.length > 0) {
                callback('1', { keywords: 'list success', content: {} }, result);
            } else {
                callback('2', { keywords: 'keyword_data_error', content: {} }, null);
            }
        });
    },

    create_bank_account: (request, callback) => {
        auth.checkaccountnumber(request, (is_exist) => {
            auth.BankDetails(request.user_id, function (bankDetails) {
                if(bankDetails == null){
                    con.query(`select u.id,CONCAT(u.first_name,' ',u.last_name) as name,u.email,u.country_code,u.mobile_number,c.country as country_name,c.sortname as code,c.currency from tbl_user u LEFT JOIN tbl_country c ON c.id = ${request.country_id} where u.id= ${request.user_id} AND u.is_active='1' AND c.is_deleted='0'`, function (err, result) {
                        if (!err) {
                            var getdob = request.dob.split("-");
                            var d_year = getdob[0];
                            var d_month = getdob[1];
                            var d_day = getdob[2];
    
                            var ssn_last_4 = Math.floor(1000 + Math.random() * 9000); //rand(1000,9999)
                            var fp = fs.readFileSync('./' + globals.BANK_IMAGE + request.bank_image);
                            var file = {};
                            bankstripe.files.create({
                                purpose: 'identity_document',
                                file: {
                                    data: fp,
                                    name: request.bank_image,
                                    type: 'application/GUIDA'
                                }
                            }, function (err, fileUpload) {
                                file = fileUpload;
                                var account_data = {
                                    type: 'custom',
                                    country: result[0].code,
                                    email: result[0].email,
                                    business_type: 'individual',
                                    requested_capabilities: ['card_payments', 'transfers'],
                                    business_profile: {
                                        mcc: '5965',
                                        name: result[0].name,
                                        // url: "www.guida.com",
                                        product_description: "",
                                    },
                                    individual: {
                                        address: {
                                            state: request.state,
                                            city: request.city,
                                            postal_code: request.postal_code,
                                            line1: request.address,
                                        },
                                        dob: {
                                            day: d_day,
                                            month: d_month,
                                            year: d_year,
                                        },
                                        id_number: request.ssn_last,
                                        email: result[0].email,
                                        first_name: result[0].first_name,
                                        last_name: 'Ealiox',
                                        // phone: request.mobile_number,
                                        // country_code :request.country_code,
    
                                        verification: {
                                            document: {
                                                front: file.id
                                            },
    
                                            additional_document: {
                                                front: file.id
                                            },
                                        },
                                    },
                                    tos_acceptance: {
                                        date: Math.floor(Date.now() / 1000),
                                        ip: '192.168.1.132',
                                    },
                                    external_account: {
                                        // user_id: request.user_id,
                                        object: 'bank_account',
                                        // country: 'United state ',
                                        country: result[0].code,
                                        currency: result[0].currency,
                                        bank_name: request.bank_name,
                                        account_holder_name: request.account_holder_name,
                                        account_number: request.account_number,
                                        routing_number: request.routing_number,
                                    }
                                };
                                bankstripe.accounts.create(account_data, function (errs, bankresult) {
                                    if (!errs && bankresult != undefined) {
                                        var bankobj = {
                                            user_id: request.user_id,
                                            bank_name: request.bank_name,
                                            account_holder_name: request.account_holder_name,
                                            account_number: request.account_number,
                                            routing_number: request.routing_number,
                                            ssn_last: (request.ssn_last != undefined) ? request.ssn_last.slice(-4) : '',
                                            address: bankresult.individual.address.line1,
                                            state: bankresult.company.address.state,
                                            city: bankresult.company.address.city,
                                            country: result[0].code,
                                            postal_code: request.postal_code,
                                            bank_documnet: request.bank_image,
                                            mobile: request.mobile_number,
                                            dob: request.dob,
                                            country_code: result[0].country_code,
                                            country_id: request.country_id,
                                            state_id: request.state_id,
                                            city_id: request.city_id,
                                            merchant_account_id: bankresult.id,
                                            bank_token: bankresult.external_accounts.data[0].id,
                                            bank_payout_token: bankresult.external_accounts.data[0].id,
                                        };
                                        con.query(`insert into tbl_bank_details set ?`, [bankobj], function (err, addresult) {
                                            if (!err) {
                                                var id = addresult.insertId;
                                                auth.BankDetails(request.user_id, function (bank_details) {
                                                    if (bank_details == null) {
                                                        callback(3, { keywords: "data_not_found", content: {} }, null);
                                                    } else {
                                                        callback(1, { keywords: "text_bank_create_success", content: {} }, bank_details);
                                                    }
                                                });
                                            } else {
                                                callback(3, { keywords: "data_not_found", content: {} }, null);
                                            }
                                        });
                                    } else {
                                        console.log('fhsdghfsdgfhsgdfhgsdgfsgdfgsdhfgjsdgfd', errs);
                                        callback(0, { keywords: errs.message, content: {} }, null);
                                    }
                                });
    
                            });
                        } else {
                            callback(0, { keywords: "key_something_wrong", content: {} }, null);
                        }
                    });
                } else {
                    let stripeAccountId = bankDetails.merchant_account_id;
                    // log
                    // Replace this with the actual field name for the Stripe Account ID
                    // Update the bank account details using the Stripe API
                    var fp = fs.readFileSync('./' + globals.BANK_IMAGE + request.bank_image);
                    var file = {};
                    bankstripe.accounts.update(
                        stripeAccountId,
                        bankstripe.files.create({
                            purpose: 'identity_document',
                            file: {
                                data: fp,
                                name: request.bank_image,
                                type: 'application/GUIDA'
                            }
                        }),
                        {
                            external_account: {
                                object: 'bank_account',
                                // Add the updated bank account details here
                                account_holder_name: request.account_holder_name,
                                account_number: request.account_number,
                                routing_number: request.routing_number,
                                country: 'US'
                                // You can add other fields as needed for updating bank details
                            },
                        },
                        function (err, updatedAccount) {
                            if (err && updatedAccount != undefined) {
                                callback(0, { keywords: err.message, content: {} }, null);
                            } else {
                                // Update the bank details in your database with the new data
                                const updatedBankDetails = {
                                    bank_name: request.bank_name,
                                    account_holder_name: request.account_holder_name,
                                    account_number: request.account_number,
                                    routing_number: request.routing_number,
                                    state: request.state,
                                    city: request.city,
                                    postal_code: request.postal_code,
                                    address: request.address,
                                    ssn_last: (request.ssn_last != undefined) ? request.ssn_last.slice(-4) : '',
                                    country_id: request.country_id,
                                    state_id: request.state_id,
                                    city_id: request.city_id,
                                    dob: request.dob,
                                    mobile: request.mobile_number,
                                    country_code: request.country_code,
                                    bank_documnet:request.bank_image,
                                    // Add other fields as needed for your database update
                                };

                                con.query(`UPDATE tbl_bank_details SET ? WHERE user_id = ${request.user_id}`, [updatedBankDetails], function (err, updateResult) {
                                    if (err) {
                                        callback(0, { keywords: "key_something_wrong", content: {} }, null);
                                    } else {
                                        auth.BankDetails(request.user_id, function (bank_details) {
                                            if (bank_details == null) {
                                                callback(3, { keywords: "data_not_found", content: {} }, null);
                                            } else {
                                                callback(1, { keywords: "text_bank_update_success", content: {} }, bank_details);
                                            }
                                        })
                                    }
                                });
                            }
                        }
                    );
                }
                
            })
            // if (is_exist) {
                
            // } else {
                
            // }
        });
    },


    getBankDetails: function (request, callback) {
        con.query(`select *,CONCAT('${process.env.BASE_URL}','${globals.BANK_IMAGE}', bank_documnet) as bank_documnet from tbl_bank_details bd where user_id = ${request.user_id} and is_active = '1' and is_delete = '0'`, (error, bankdetails) => {
            if (!error && bankdetails.length > 0) {
                callback('1', { keywords: "success", content: {} }, bankdetails);
            } else {
                callback('0', { keywords: "keyword_data_error", content: {} }, null);
            }
        })
    },

    //=====>===>====>>>====>=====>>=====>  User New Bank Card Add 
    addNewCard: (request, user_id, callback) => {
        var sql = `INSERT INTO tbl_card SET ?`;
        var user_data = {
            user_id: user_id,
            card_company_name: request.card_company_name,
            card_number: request.card_number,
            name_on_card: request.name_on_card,
            expiry_month: request.expiry_month,
            expiry_year: request.expiry_year,
            cvv: request.cvv,
        }
        con.query(sql, user_data, (err, result) => {
            if (!err && result.affectedRows > 0) {
                callback('1', { keywords: 'success_message', content: {} }, result);
            } else {
                callback('0', { keywords: 'failed_to_add_card_details', content: {} }, err);
            }
        });
    },

    //=====>===>====>>>====>=====>>=====> Card delete 
    deleteCard: (request, user_id, callback) => {
        var sql = `DELETE FROM tbl_card WHERE user_id = ${user_id}`;
        con.query(sql, (err, result) => {
            if (!err && result.affectedRows > 0) {
                callback('1', { keywords: 'delete_success_message', content: {} }, result);
            } else {
                callback('0', { keywords: 'failed_to_delete_card_details', content: {} }, err);
            }
        });
    },

    /* =====>===>====>>>====>=====>>=====>   Guide Shoe Profile && edit && update && delete */


    // getUserGuideDetails function
    getUserGuideDetails: (user_id, callback) => {
        var sql = `SELECT u.*, CONCAT(${process.env.S3_BUCKET_ROOT}', 'user/', u.profile_image) AS image_url, IFNULL(ud.token,'') as token, IFNULL(ud.device_type,'') as device_type, IFNULL(ud.device_token,'') as device_token, gd.social_media_link, gd.about, gd.experience FROM tbl_user u
        LEFT JOIN tbl_user_deviceinfo ud ON u.id = ud.user_id
        LEFT JOIN tbl_guide_details gd ON u.id = gd.user_id WHERE u.id = ${user_id}`;
        con.query(sql, (err, result) => {
            if (!err && result.length > 0) {
                callback(result)
                // callback('1', { keywords: "keywords_user_details", content: {} }, user_data);
            } else {
                callback([])
                // callback('0', { keywords: "keywords_user_details_error", content: {} }, null);
            }
        });
    },

    // expertiseByGuide function
    expertiseByGuide: (user_id, callback) => {
        // Fetch the main (static) expertise (activity)
        const staticActivitySql = `SELECT *, CONCAT('${process.env.S3_BUCKET_ROOT}','activity/', activity_image) AS activity_image  FROM tbl_expertise WHERE is_active = '1' AND is_delete = '0' AND parent_id = '0'`;
        con.query(staticActivitySql, (err, result) => {
            if (!err && result.length > 0) {
                asyncLoop(result, (item, next) => {
                    // Fetch the sub expertise (activity)
                    const subActivitySql = `SELECT e.*, gce.id, gce.user_id, gce.activity_id, e.activity, e.parent_id 
                        FROM tbl_guide_chosen_expertise AS gce
                        JOIN tbl_expertise AS e ON gce.activity_id = e.id
                        WHERE gce.user_id = ${user_id} AND e.parent_id = ${item.id}`

                    con.query(subActivitySql, (err, record) => {
                        if (!err && record.length > 0) {
                            item.sub_expertise = record;
                            next();
                        } else {
                            next();
                        }
                    });
                }, () => {
                    // Filter out items with empty sub_expertise array
                    const guideExpertise = result.filter(item => item.sub_expertise && item.sub_expertise.length > 0).map(item => ({
                        mainActivity: item,
                        sub_expertise: item.sub_expertise || []
                    }));
                    callback(guideExpertise);
                });
            } else {
                // callback('0', { keywords: 'failed_to_get_expertise', content: {} }, null);
                callback([]);
            }
        });
    },

    // knownLanguageByGuide Fucntion.
    knownLanguageByGuide: (user_id, callback) => {
        var sql = `SELECT gcl.language_id, l.name, CONCAT('${process.env.S3_BUCKET_ROOT}','flag/', l.image) AS language_image
                        FROM tbl_guide_chosen_language gcl
                        JOIN tbl_language l ON l.id = gcl.language_id
                        WHERE gcl.is_active = '1' AND gcl.is_delete = '0' AND gcl.user_id = ${user_id};`
        con.query(sql, (err, result) => {
            if (!err && result.length > 0) {
                callback(result);
            } else {
                callback([])
            }
        });
    },



    // function for fetching slot data.
    getSlotData: (request, user_id, callback) => {
        var date = moment(request.date, "YYYY-MM-DD", true).format('YYYY-MM-DD');
        const sql = `SELECT * FROM tbl_availability
                WHERE (
                    CASE
                        WHEN chosen_frequency = 'daily' THEN 1
                        WHEN chosen_frequency = 'weekly' AND week_day = LOWER(DAYNAME('${date}')) THEN 1
                        WHEN chosen_frequency = 'monthly' AND DAY(available_date) = DAY('${date}') THEN 1
                        WHEN chosen_frequency = 'norepeat' AND available_date = '${date}' THEN 1
                        ELSE 0
                    END
                ) = 1
                AND is_delete = '0'
                AND available_date <= '${date}'
                AND user_id = ${user_id};`;
        con.query(sql, (err, result) => {
            if (!err && result.length > 0) {
                callback('1', { keywords: 'success_message', content: {} }, result);
            } else {
                callback('0', { keywords: 'failed_to_get_slot_data', content: {} }, null);
            }
        });
    },

    // function for getting updated availability.
    getupdateavaiblity: (request, callback) => {
        var sql = `SELECT * from tbl_availability WHERE user_id = ${request.user_id} AND is_active = '1' AND is_delete = '0'`;
        con.query(sql, (error, result) => {
            if (!error && result.length > 0) {
                callback('1', { keywords: 'success_message', components: {} }, result)
            } else {
                callback('0', { keywords: 'data_not_found', components: {} }, null)
            }
        });
    },

    // function for updating availability.
    updateAvailability: (request, callback) => {
        //var date = moment(request.date, "DD-MM-YYYY", true).format('YYYY-MM-DD');
        // request.newdate = date;
        auth.checkTime(request, (is_true) => {
            if (is_true) {
                callback('0', { keyword: "sloat_already_booked", content: {} }, {});
            } else {
                var update = {
                    user_id: request.user_id,
                    available_date: request.date,
                    start_time: request.start_time,
                    end_time: request.end_time,
                    chosen_frequency: request.frequency,
                    // week_day: (request.chosen_frequency == 'weekly') ? 'required' : ''

                }
                var sql = `UPDATE tbl_availability SET ? WHERE id =${request.update_id}`;
                con.query(sql, [update], (error, result) => {
                    if (!error) {
                        callback('1', { keywords: "updated_avaiblity", content: {} }, { result });
                    } else {
                        callback('0', { keywords: "avaiblity_not_updated", content: {} }, {});
                    }
                });
            }
        });
    },

    // function for deleting availability. 
    deleteavaiblity: (request, callback) => {
        var upddata = {
            is_active: 0,
            is_delete: 1
        }
        var sql = `UPDATE tbl_availability SET ? WHERE ID =${request.delete_id}`;
        con.query(sql, [upddata], (err, result) => {
            if (!err) {
                callback('1', { keywords: 'keyword_slot_delete_success', content: {} }, null);
            } else {
                callback('0', { keywords: 'failed_to_delete_avablity_slot', content: {} }, null);
            }
        });
    },


    // guideAvailability function
    guideAvailability: (user_id, callback) => {
        // here do group by av.available date
        var sqlAvailability = `SELECT av.id, av.available_date, av.start_time, av.end_time, av.chosen_frequency
                           FROM tbl_availability av
                           WHERE av.is_active = '1' AND av.is_delete = '0' AND av.user_id = ${user_id}`

        con.query(sqlAvailability, (err, result) => {
            if (!err && result.length > 0) {
                callback([{ "available_date": currentDate, "availability": result }]);
            } else {
                callback("0", { keywords: 'failed_to_get_availability_data', content: {} }, null);
            }
        });
    },

    // guideRatingDetails function.
    guideRatingDetails: (user_id, callback) => {
        const sqlRating = `SELECT r.id, r.user_id, u.first_name, CONCAT('${process.env.S3_BUCKET_ROOT}','user/', u.profile_image) AS profile_image, r.rating, r.review, r.create_at
        FROM tbl_rating r 
        JOIN tbl_user u ON u.id = r.user_id
        WHERE r.guide_id = ${user_id};`
        con.query(sqlRating, (err, result) => {
            if (!err && result.length > 0) {
                // callback("1", { keywords: 'success_message', content: {} }, rating_data);
                callback(result);
            } else {
                callback([])
                // callback("0", { keywords: 'failed_to_get_rating_data', content: {} }, null);
            }
        })
    },

    // Function for getting guide profile.
    guideProfile: (user_id, callback) => {
        if (user_id != null && user_id != undefined) {
            auth.getUserGuideDetails(user_id, (data) => {
                const guideData = data;
                if (data != null) {
                    auth.expertiseByGuide(user_id, (expertise) => {
                        const guideExpertise = expertise;

                        auth.knownLanguageByGuide(user_id, (knownLanguage) => {
                            const guideKnownLanguage = knownLanguage;

                            auth.guideAvailability(user_id, (availability) => {

                                const guideAvailability = availability;
                                auth.guideRatingDetails(user_id, (rating) => {
                                    const guideRating = rating;

                                    const guideProfileData = {
                                        guide_profile: guideData,
                                        guide_expertise: guideExpertise,
                                        guide_known_language: guideKnownLanguage,
                                        guide_availability: guideAvailability,
                                        guide_rating: guideRating
                                    }
                                    // callback('1', { keywords: 'success_message', content: {} }, { guide_profile: data, guide_expertise: expertise, guide_known_language: knownLanguage, guide_availability: availability, guide_rating: rating });
                                    callback('1', { keywords: 'success_message', content: {} }, guideProfileData)

                                })

                            })

                        })

                    })
                } else {
                    callback('0', { keywords: 'failed_to_get_guide_details', content: {} }, null);
                }
            });
        } else {
            callback('0', { keywords: 'missing_user_id', content: {} }, null);
        }
    },

    // function for getting ratings & reviews.
    getRatingsAndReviews: (request, user_id, callback) => {
        const offset = (request.page - 1) * request.limit; // Calculate the offset based on the page and limit
        // (SELECT AVG(rating) AS avg_rating FROM tbl_rating WHERE guide_id = ${user_id}) AS avg_rating,
        // (SELECT COUNT(*) AS total_reviews_count FROM tbl_rating WHERE guide_id = ${user_id}) AS total_reviews_count

        const sql = `SELECT r.id, r.user_id, CONCAT('${process.env.S3_BUCKET_ROOT}','user/',u.profile_image) AS img_url, u.first_name, r.rating, r.review, r.create_at
        FROM tbl_rating r
        JOIN tbl_user u ON u.id = r.user_id
        WHERE r.guide_id = ${request.guide_id}
        LIMIT ${request.limit} OFFSET ${offset}`;

        con.query(sql, (err, result) => {
            if (!err && result.length > 0) {
                var rating_data = result;
                // const avgRatingsAndReviewsCountSql = `SELECT 
                // (SELECT AVG(rating) AS avg_rating FROM tbl_rating WHERE guide_id = ${request.guide_id}) AS avg_rating,
                // (SELECT COUNT(*) AS total_reviews_count FROM tbl_rating WHERE guide_id = ${request.guide_id}) AS total_reviews_count`;
                const avgRatingsAndReviewsCountSql = `SELECT 
                (SELECT AVG(rating) AS avg_rating FROM tbl_rating WHERE guide_id = ${request.guide_id}) AS avg_rating,
                (SELECT COUNT(*) AS total_reviews_count FROM tbl_rating WHERE guide_id = ${request.guide_id}) AS total_reviews_count
                    FROM tbl_rating 
                    WHERE guide_id = ${request.guide_id}
                    GROUP BY guide_id`;
                con.query(avgRatingsAndReviewsCountSql, (err, result) => {
                    if (!err && result.length > 0) {
                        callback('1', { keywords: 'success_message', content: {} }, { avgRatingsAndReviewsCountSql: result, ratingList: rating_data });
                    } else {
                        callback('2', { keywords: 'no_rating_data_found', content: {} }, null);
                    }
                })
            } else {
                callback('2', { keywords: 'no_rating_data_found', content: {} }, null);
            }
        })
    },

    // function for updating guide language.
    guideupdatelanguage: (request, user_id, callback) => {
        if (!request || !request.language_id || request.language_id.length === 0) {
            callback('0', { keyword: 'missing_language_id', content: {} }, null);
        } else {
            // Soft delete the existing language for the guide (user_id).
            const softDeleteSql = `UPDATE tbl_guide_chosen_language SET is_active = 0, is_delete = 1 WHERE user_id = ?`;
            con.query(softDeleteSql, [user_id], (softDeleteErr, softDeleteResult) => {
                if (softDeleteErr) {
                    callback('0', { keywords: 'failed_to_soft_delete_language', content: {} }, null);
                } else {
                    // Update all the language_id for the guide (user_id).
                    const languageIds = request.language_id;
                    const updateSql = `INSERT INTO tbl_guide_chosen_language (user_id, language_id, is_active, is_delete) VALUES ?`;
                    const values = languageIds.map(language_id => [user_id, language_id, 1, 0]);
                    con.query(updateSql, [values], (updateErr, updateResult) => {
                        if (!updateErr) {
                            // Retrieve the updated known languages.
                            auth.knownLanguageByGuide(user_id, (data) => {
                                if (data.length > 0) {
                                    callback('1', { keywords: 'success_message', content: {} }, { known_language: data });
                                } else {
                                    callback('0', { keywords: 'failed_to_get_language_data', content: {} }, null);
                                }
                            });
                        } else {
                            callback('0', { keywords: 'failed_to_add_known_language', content: {} }, null);
                        }
                    });
                }
            });
        }
    },

    // function for updating `about me` section.
    updateAboutMe: (request, user_id, callback) => {
        const updateAboutMeSql = `UPDATE tbl_guide_details SET ? WHERE user_id = ${user_id}`;
        const data = {
            about: request.about_me,
            // social_media_link: request.social_media_link,
            // experience: request.experience
        };

        if (request.social_media_link != undefined && request.social_media_link != null) {
            data.social_media_link = request.social_media_link;
        }

        // First, update the `tbl_guide_details` table with the data.
        con.query(updateAboutMeSql, [data], (err, result) => {
            if (err) {
                callback('0', { keywords: 'failed_to_update_about_me', content: {} }, null);
            } else {
                var anotherData = {
                    latitude: request.latitude,
                    longitude: request.longitude,
                };

                const sql = `UPDATE tbl_user SET ?, region_id = ${request.id} WHERE id = ${user_id}`;

                con.query(sql, [anotherData], (err, result) => {
                    if (err) {
                        callback('0', { keywords: 'failed_to_update_about_me', content: {} }, null);
                    } else {
                        const userDetailsSql = `SELECT gd.*, u.*
                        FROM tbl_guide_details gd
                        JOIN tbl_user u ON u.id = gd.user_id
                        WHERE u.id = ${user_id}`;
                        con.query(userDetailsSql, (err, result) => {
                            if (!err && result.length > 0) {
                                callback('1', { keywords: 'success_message', content: {} }, { about_me: result });
                            } else {
                                callback('0', { keywords: 'failed_to_get_user_details', content: {} }, null);
                            }
                        });
                    }
                });
            }
        });
    },

    // function for changing password. 
    changePassword: (request, callback) => {
        auth.getUserDetails(request.user_id, (userprofile) => {

            if (userprofile != null) {
                var currentpassword;
                middleware.decryption(userprofile.password, (response) => {
                    currentpassword = response
                });
                if (currentpassword != request.old_password) {
                    callback("0", { keywords: 'old_password_is_incorrect', content: {} }, null);
                } else if (currentpassword == request.new_password) {
                    callback("0", { keywords: 'rest_keywords_user_newold_password_similar', content: {} }, null);
                } else {
                    var password;
                    middleware.encryption(request.new_password, (request) => {
                        password = request
                    });
                    var updparams = {
                        password: password
                    };
                    common.singleUpdate('tbl_user', updparams, `id=${request.user_id}`, (updresult) => {
                        auth.getUserDetails(request.user_id, (userProfile) => {
                            if (userProfile == null) {
                                callback("2", { keywords: 'user_data_not_found', content: {} }, null);
                            } else {
                                callback("1", { keywords: 'sucess_message', content: {} }, userProfile);
                            }
                        })
                    });
                }
            } else {
                callback("3", { keywords: 'user_data_not_found', content: {} }, null);
            }
        });
    },

    // function for editing profile.
    editProfile: (request, callback) => {
        var updatedata = {
            first_name: request.first_name,
            last_name: request.last_name,
            email: request.email,
            country_code: (request.country_code != undefined) ? request.country_code : null,
            mobile_number: (request.mobile_number != undefined) ? request.mobile_number : null
        }

        if (request.profile_image != undefined && request.profile_image != "") {
            updatedata.profile_image = request.profile_image;
        }

        var sql = "update tbl_user set ? where id = ?";
        con.query(sql, [updatedata, request.user_id], (error, result) => {
            if (!error) {
                auth.getUserDetails(request.user_id, function (getdetails) {
                    if (getdetails == null) {
                        callback('0', { keywords: "failed_to_get_user_details", content: {} }, null);
                    } else {
                        callback('1', { keywords: "keyword_update_details", content: {} }, getdetails);
                    }
                });
            } else {
                callback('0', { keywords: "something_went_wrong", content: {} }, null);
            }
        });
    },

    // function for deleting account.
    deleteAccount: (user_id, callback) => {
        var sql = "UPDATE tbl_user SET is_active = '0' , is_delete = '1' WHERE id = ?";
        con.query(sql, [user_id], (err, result) => {
            if (!err) {
                var sql = "UPDATE tbl_user_deviceinfo SET token = '', device_token = '' WHERE user_id = ?";
                con.query(sql, [user_id], (err, result) => {
                    if (!err) {
                        callback("1", { keywords: 'success_message', content: {} }, {});
                    } else {
                        callback("0", { keywords: 'failed_to_update_token', content: {} }, null);
                    }
                });
            } else {
                callback("0", { keywords: 'failed_to_delete_account', content: {} }, null);
            }
        });
    },

    // function for updating expertise
    updateExpertise: (request, user_id, callback) => {
        // Soft delete existing activities for the user
        const softDeleteSql = `DELETE FROM tbl_guide_chosen_expertise WHERE user_id = ?`;
        con.query(softDeleteSql, [user_id], (err, deleteResult) => {
            if (err) {
                callback('0', { keywords: 'failed_to_update_expertise', content: {} }, null);
            } else {
                asyncLoop(request.activity_id, (item, next) => {
                    var param = {
                        user_id: user_id,
                        activity_id: item
                    }
                    var sql = "INSERT INTO tbl_guide_chosen_expertise SET ?";
                    // const insertSql = `INSERT INTO tbl_guide_chosen_expertise (user_id, activity_id) VALUES ?`;
                    con.query(sql, param, (err, insertResult) => {
                        next();
                    });
                }, () => {
                    const sql = `SELECT * FROM tbl_guide_chosen_expertise WHERE user_id = ${user_id} AND is_active = '1' AND is_delete = '0'`;
                    con.query(sql, (err, result) => {
                        if (!err && result.length > 0) {
                            callback("1", { keywords: 'success_message', content: {} }, { expertise_data: result });
                        } else {
                            callback("0", { keywords: 'failed_to_get_expertise_data', content: {} }, null);
                        }
                    })
                });
            }
        });
    },


    // getcountrylist: function (request, callback) {
    //     con.query(`select id,country,flag,nationality,sortname,currency,currency_name,country_code from tbl_country where is_active ='1' and is_deleted = '0'`, (error, result) => {
    //         if (!error && result.length > 0) {
    //             callback('1', { keywords: 'list success', content: {} }, result);
    //         } else {
    //             callback('0', { keywords: 'error', content: {} }, null);
    //         }
    //     });
    // },
    // function for deleting expertise.
    deleteExpertise: (request, callback) => {
        const selectSql = `SELECT * FROM tbl_guide_chosen_expertise WHERE user_id = ${request.user_id} AND activity_id = ${request.activity_id}`;
        con.query(selectSql, (error, result) => {
            if (error) {
                callback('0', { keywords: 'failed_to_delete_expertise', content: {} }, null);
            } else {
                if (result.length > 0) {
                    const deleteSql = `DELETE FROM tbl_guide_chosen_expertise WHERE user_id = ${request.user_id} AND activity_id = ${request.activity_id}`;
                    con.query(deleteSql, (err, result) => {
                        if (err) {
                            callback('0', { keywords: 'failed_to_delete_expertise', content: {} }, null);
                        } else {
                            callback('1', { keywords: 'expertise_deleted', content: {} }, null);
                        }
                    });
                } else {
                    callback('0', { keywords: 'expertise_not_found', content: {} }, null);

                }
            }
        });
    },


    
};




module.exports = auth;
