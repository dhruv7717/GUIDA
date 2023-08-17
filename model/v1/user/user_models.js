var con = require('../../../config/database');
var asyncLoop = require('node-async-loop');
var nodemailer = require("nodemailer");
var common = require('../../../config/common');
var template = require('../../../config/template');
var middleware = require('../../../middleware/validation');
const moment = require('moment');
var stripe = require('stripe');
const custome_stripe = require('../../../config/custome_stripe');
const globals = require('../../../config/constant');



var user = {

    // function for fetching region details.
    regionDetails: (region_id, callback) => {
        var regionSql = `SELECT * FROM tbl_location WHERE id = ${region_id}`
        con.query(regionSql, (err, result) => {
            if (!err && result.length > 0) {
                callback(result[0]);
            } else {
                callback({});
            }
        });
    },

    // getUserdetails function
    getUserDetails: (user_id, callback) => {
        var sql = `SELECT u.*, CONCAT('${process.env.S3_BUCKET_ROOT}','user/', u.profile_image) AS image_url, IFNULL(ud.token,'') as token, IFNULL(ud.device_type,'') as device_type, IFNULL(ud.device_token,'') as device_token FROM tbl_user u 
        LEFT JOIN tbl_user_device_info ud ON u.id = ud.user_id WHERE u.id = ${user_id}`;
        con.query(sql, (err, result) => {
            var userData = result[0];
            if (!err && result.length > 0) {
                callback(userData);
            } else {
                callback(null);
            }
        });
    },

    // getUserGuideDetails function
    getUserGuideDetails: (request, user_id, callback) => {
        // (SELECT COUNT(rating) FROM tbl_rating WHERE guide_id = ${ user_id }) AS review_count,
        //     (SELECT AVG(rating) FROM tbl_rating WHERE guide_id = ${ user_id }) AS avg_rating
        var sql = `SELECT u.*, 
            CONCAT('${process.env.S3_BUCKET_ROOT}','user/', u.profile_image) AS image_url, 
            IFNULL(ud.token,'') as token, IFNULL(ud.device_type,'') as device_type, 
            IFNULL(ud.device_token,'') as device_token, gd.social_media_link, gd.about, gd.experience,
            (SELECT l.address FROM tbl_location l WHERE l.id = u.region_id LIMIT 1) AS Address,
            (SELECT COUNT(rating) FROM tbl_rating WHERE guide_id = u.id) AS review_count,
            (SELECT AVG(rating) FROM tbl_rating WHERE guide_id = u.id) AS avg_rating
            FROM tbl_user u
                    LEFT JOIN tbl_user_deviceinfo ud ON u.id = ud.user_id
                    LEFT JOIN tbl_guide_details gd ON u.id = gd.user_id WHERE u.id = ${user_id}`;
        con.query(sql, (err, result) => {
            var user_data = result;
            if (!err && result.length > 0) {
                callback(user_data);
            } else {
                callback(null);
            }
        });
    },

    // updateLoginStatusAndTime function
    updateLoginStatusAndTime: (user_id, callback) => {
        var last_login = new Date();
        var sql = "UPDATE tbl_user SET login_status = 'online', last_login = ? WHERE id = ?";
        con.query(sql, [last_login, user_id], (err, result) => {
            if (!err) {
                callback(true);
            } else {
                callback(false);
            }
        });
    },

    // Function for Updating login status.
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

    // resendOTp function
    resendOtp: (request, callback) => {
        var otp_code = common.randomeOTPGenerator();
        template.otpEmail(request, otp_code, (otpemailtemplate) => {
            common.sendEmail(request.email, "OTP Verification", otpemailtemplate, (mail_details) => {
                if (mail_details == null) {
                    callback("0", { keywords: 'rest_keywordss_maildatanotfound_message', content: {} }, null);
                } else {
                    callback("1", { keywords: 'rest_keywordss_success_message', content: {} }, { otp_code: otp_code, mail_message_id: mail_details.messageId });
                }
            });
        });
    },

    // function for getting complete user details.
    getUserCompleteDetails: (request, user_id, callback) => {
        var sql = `
        SELECT 
            u.*, 
            CONCAT('${process.env.S3_BUCKET_ROOT}','user/',u.profile_image) AS image_url,
            IFNULL(ud.token, '') AS token,
            IFNULL(ud.device_type, '') AS device_type,
            IFNULL(ud.device_token, '') AS device_token,
            gd.social_media_link,
            gd.about,
            gd.experience 
        FROM tbl_user u
        LEFT JOIN tbl_user_deviceinfo ud ON u.id = ud.user_id
        LEFT JOIN tbl_guide_details gd ON u.id = gd.user_id
        WHERE u.id = ${user_id}`;
        con.query(sql, (err, result) => {
            if (!err && result.length > 0) {
                const user_data = result[0];
                const isGuide = !!user_data.social_media_link; // Check if the user is a guide

                // Retrieve the guide-specific data if the user is a guide
                if (isGuide) {
                    const guide_data = {
                        social_media_link: user_data.social_media_link,
                        about: user_data.about,
                        experience: user_data.experience,
                    };

                    callback('1', { keywords: 'rest_keywordss_success_message', content: {} }, { user_data, guide_data });
                } else {
                    callback('1', { keywords: 'rest_keywordss_success_message', content: {} }, { user_data });
                }
            } else {
                callback('0', { keywords: 'rest_keywordss_user_not_found_message', content: {} }, null);
            }
        });
    },

    // function for checking if the card already exists in the table or not
    checkCard: (request, user_id, callback) => {
        var sql = `SELECT * FROM tbl_card WHERE user_id = ${user_id} AND card_number = '${request.card_number}'`;
        con.query(sql, (err, result) => {
            if (!err && result.length > 0) {
                callback(true);
            } else {
                callback(false);
            }
        });
    },

    // function for fetching the card details
    cardDetails: (user_id, callback) => {
        var sql = `SELECT * FROM tbl_card WHERE user_id = ${user_id}`;

        con.query(sql, (err, result) => {
            if (!err && result.length > 0) {
                callback(result);
            } else {
                callback(null);
            }
        });
    },

    // function for fetching user Details.
    userDetails: (request, callback) => {
        var sqlUser = `SELECT u.id, u.region_id AS region_id,
       CONCAT('${process.env.S3_BUCKET_ROOT}','user/', u.profile_image) AS img_url,
       u.first_name,
       gd.social_media_link,
       gd.experience,
       gd.about,
       (SELECT AVG(r.rating) FROM tbl_rating r WHERE r.guide_id = ${request.guide_id} LIMIT 1) AS avg_rating,
       (SELECT COUNT(r.id) FROM tbl_rating r WHERE r.guide_id = ${request.guide_id} LIMIT 1) AS review_count,
       (SELECT l.address FROM tbl_user u JOIN tbl_location l on l.id = u.region_id where u.id = ${request.guide_id} LIMIT 1) AS address
       FROM tbl_user u
JOIN tbl_guide_details gd ON gd.user_id = u.id
WHERE u.id = ${request.guide_id}`;
        con.query(sqlUser, (err, result) => {
            if (!err && result.length > 0) {
                callback(result);
            } else {
                callback(null);
            }
        });
    },

    // function for fetching experties details.
    expertiseDetails: (request, callback) => {
        // Fetch the main (static) expertise (activity)
        const staticActivitySql = `SELECT *, CONCAT('${process.env.S3_BUCKET_ROOT}','activity/', activity_image) AS activity_image  FROM tbl_expertise WHERE is_active = '1' AND is_delete = '0' AND parent_id = '0'`;
        con.query(staticActivitySql, (err, result) => {
            if (!err && result.length > 0) {
                asyncLoop(result, (item, next) => {
                    var plan_params = {
                        user_id: request.guide_id,
                        expertise_id: item.id
                    }
                    user.planDetails(plan_params, (plan_data) => {
                        item.plan_data = plan_data;

                        // Fetch the sub expertise (activity)
                        const subActivitySql = `SELECT gce.id, gce.user_id, gce.activity_id, e.activity, e.parent_id 
            FROM tbl_guide_chosen_expertise AS gce
            JOIN tbl_expertise AS e ON gce.activity_id = e.id
            WHERE gce.user_id = ${request.guide_id} AND e.parent_id = ${item.id}`

                        con.query(subActivitySql, (err, record) => {
                            if (!err && record.length > 0) {
                                item.sub_expertise = record;
                                next();
                            } else {
                                next();
                            }
                        });
                    });
                }, () => {
                    const guideExpertise = result.filter(item => item.sub_expertise && item.sub_expertise.length > 0 && item.plan_data.length > 0).map(item => ({
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

    // function for fetching language details.
    languageDetails: (request, callback) => {
        var sqlLanguage = `SELECT gcl.language_id, l.name, CONCAT('${process.env.S3_BUCKET_ROOT}','flag/', l.image) AS language_image
        FROM tbl_guide_chosen_language gcl
                        JOIN tbl_language l ON l.id = gcl.language_id
                        WHERE gcl.user_id = ${request.guide_id} AND gcl.is_active = '1' AND gcl.is_delete = '0'`;
        con.query(sqlLanguage, (err, result) => {
            if (!err && result.length > 0) {
                callback(result);
            } else {
                callback([]);
            }
        });
    },

    // function for fetching availability details.
    availabilityDetails: (request, callback) => {
        var date = moment().format('YYYY-MM-DD');
        const sql = `SELECT id, available_date, start_time, end_time, chosen_frequency FROM tbl_availability
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
                AND user_id = ${request.guide_id}`;
        con.query(sql, (err, result) => {
            if (!err && result.length > 0) {
                var availability_data = result;
                callback(availability_data);
            } else {
                callback([]);
            }
        });
    },

    // function for fetching rating details.
    ratingDetails: (request, callback) => {
        const sqlRating = `SELECT r.id, r.user_id, u.first_name, CONCAT('${process.env.S3_BUCKET_ROOT}','user/', u.profile_image) AS profile_image, r.rating, r.review, r.create_at
        FROM tbl_rating r 
        JOIN tbl_user u ON u.id = r.user_id
        WHERE r.guide_id = ${request.guide_id};`
        con.query(sqlRating, (err, result) => {
            if (!err && result.length > 0) {
                var rating_data = result;
                callback(rating_data);
            } else {
                callback([]);
            }
        });
    },

    // function for fetching plan details.
    planDetails: (request, callback) => {
        var sqlPlan = `SELECT p.id,p.expertise_id, p.plan_name, p.price, p.description FROM tbl_plan p WHERE p.user_id = ${request.user_id} AND p.expertise_id = ${request.expertise_id};`;

        con.query(sqlPlan, (err, result) => {
            if (!err && result.length > 0) {
                var plan_data = result;
                callback(plan_data);
            } else {
                callback([]);
            }
        });
    },

    // function for answer latest by in guide details.
    answerLatestBy: (request, callback) => {
        var current_date = moment().format('YYYY-MM-DD');
        var current_time = moment().format('HH:mm:ss');
        const sql = `SELECT start_time, end_time FROM tbl_availability
                                    WHERE (
                                        CASE
                                            WHEN chosen_frequency = 'daily' THEN 1
                                            WHEN chosen_frequency = 'weekly' AND week_day = LOWER(DAYNAME('${current_date}')) THEN 1
                                            WHEN chosen_frequency = 'monthly' AND DAY(available_date) = DAY('${current_date}') THEN 1
                                            WHEN chosen_frequency = 'norepeat' AND available_date = '${current_date}' THEN 1
                                            ELSE 0
                                        END
                                    ) = 1
                                    AND is_delete = '0'
                                    AND available_date <= '${current_date}' AND user_id = '${request.guide_id}' AND start_time > '${current_time}' order by available_date desc limit 1`;
        con.query(sql, (err, result) => {
            if (!err && result.length > 0) {
                const remainder = 10 - (moment(result[0].start_time, 'HH:mm:ss').minute() % 10);
                var answer_latest_by_time = moment(result[0].start_time, 'HH:mm:ss').add(30, 'minutes').add(remainder, "minutes").format('HH:mm')
                callback(answer_latest_by_time);
            } else {
                callback("")
            }
        });
    },

    // function for getting rating details.
    ratingReviewDetails: (rating_id, callback) => {
        var sql = `SELECT r.*,concat(u.first_name, " ", u.last_name)as sender_name FROM tbl_rating r join tbl_user u on r.user_id=u.id where r.id = ${rating_id}`
        con.query(sql, (err, result) => {
            if (!err && result.length > 0) {
                var ratingData = result;
                callback(ratingData)
            } else {
                callback(false)
            }
        })
    },


    // expertiseByGuide function
    expertiseByGuide: (request, user_id, callback) => {
        // Fetch the main (static) expertise (activity)
        const staticActivitySql = `SELECT *, CONCAT('${process.env.S3_BUCKET_ROOT}','activity/', activity_image) AS activity_image  FROM tbl_expertise WHERE is_active = '1' AND is_delete = '0' AND parent_id = '0'`;
        con.query(staticActivitySql, (err, result) => {
            if (!err && result.length > 0) {
                asyncLoop(result, (item, next) => {
                    var plan_params = {
                        user_id: user_id,
                        expertise_id: item.id
                    }
                    user.planDetails(plan_params, (plan_data) => {
                        item.plan_data = plan_data;

                        // Fetch the sub expertise (activity)
                        const subActivitySql = `SELECT e.*, gce.id, gce.user_id, gce.activity_id, e.activity, e.parent_id 
                            FROM tbl_guide_chosen_expertise AS gce
                            JOIN tbl_expertise AS e ON gce.activity_id = e.id
                            WHERE gce.user_id = ${user_id} AND e.parent_id = ${item.id}`

                        con.query(subActivitySql, (err, record) => {
                            if (!err && record.length > 0) {
                                item.sub_expertise = record;
                                next()
                            } else {
                                next();
                            }
                        });
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
                // callback("0", { keywords: 'failed_to_get_language_data', content: {} }, null);
                callback([])
            }
        });
    },

    // guideAvailability function
    guideAvailability: (request, user_id, callback) => {
        // Get the current date in 'YYYY-MM-DD' format
        const currentDate = moment().format('YYYY-MM-DD');

        // var sqlAvailability = `SELECT av.id, av.available_date, av.start_time, av.end_time, av.chosen_frequency
        //                FROM tbl_availability av
        //                WHERE av.is_active = '1' AND av.is_delete = '0' AND av.user_id = ${user_id} AND av.available_date = '${currentDate}'`;

        // var date = moment().format('YYYY-MM-DD');
        const sqlAvailability = `SELECT id, available_date, start_time, end_time, chosen_frequency FROM tbl_availability
                WHERE (
                    CASE
                        WHEN chosen_frequency = 'daily' THEN 1
                        WHEN chosen_frequency = 'weekly' AND week_day = LOWER(DAYNAME('${currentDate}')) THEN 1
                        WHEN chosen_frequency = 'monthly' AND DAY(available_date) = DAY('${currentDate}') THEN 1
                        WHEN chosen_frequency = 'norepeat' AND available_date = '${currentDate}' THEN 1
                        ELSE 0
                    END
                ) = 1
                AND is_delete = '0'
                AND available_date <= '${currentDate}'
                AND user_id = ${user_id}`;

        con.query(sqlAvailability, (err, result) => {
            if (!err && result.length > 0) {
                callback([{ "available_date": currentDate, "availability": result }]);
            } else {
                callback([]);
                // callback("0", { keywords: 'failed_to_get_availability_data', content: {} }, null);
            }
        });
    },

    // guideRatingDetails function.
    guideRatingDetails: (request, user_id, callback) => {
        const sqlRating = `SELECT r.id, r.user_id, u.first_name, CONCAT('${process.env.S3_BUCKET_ROOT}','user/', u.profile_image) AS profile_image, r.rating, r.review, r.create_at
        FROM tbl_rating r 
        JOIN tbl_user u ON u.id = r.user_id
        WHERE r.guide_id = ${user_id};`
        con.query(sqlRating, (err, result) => {
            if (!err && result.length > 0) {
                var rating_data = result;
                // callback("1", { keywords: 'success_message', content: {} }, rating_data);
                callback(rating_data);
            } else {
                callback([])
                // callback("0", { keywords: 'failed_to_get_rating_data', content: {} }, null);
            }
        })
    },

    // Function for finding guides.
    findMyGuide: (request, user_id, callback) => {
        var current_date = moment().format('YYYY-MM-DD');
        var current_time = moment().format('hh:mm');
        var locationSql = `SELECT * FROM tbl_location WHERE ST_CONTAINS(polyline_coordinates, ST_GeomFromText('POINT(${request.latitude} ${request.longitude})')) AND is_delete = '0' AND is_active = '1'`;


        var param_sql = ``;
        if (request.main_expertise_id != '' && request.main_expertise_id != undefined) {
            param_sql = `(SELECT price FROM tbl_plan WHERE user_id = u.id AND expertise_id = '${request.main_expertise_id}' ORDER BY price ASC LIMIT 1) as price, `
        } else {
            // priceSql = `(SELECT price FROM tbl_plan WHERE user_id = u.id AND expertise_id IN ('${request.expertise_id}') ORDER BY price ASC LIMIT 1) as price,`
            param_sql = `(SELECT price FROM tbl_plan WHERE user_id = u.id ORDER BY price ASC LIMIT 1) as price,`
        }



        let date = moment().format('YYYY-MM-DD');
        // param_sql += `(SELECT end_time FROM tbl_availability
        param_sql += `(SELECT start_time FROM tbl_availability
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
            AND available_date <= '${date}' AND user_id = u.id AND end_time >= '${current_time}' > 0 ORDER BY start_time ASC limit 1) as availability`;




        // (SELECT available_date FROM tbl_availability WHERE user_id = u.id AND is_active = '1' AND is_delete = '0' GROUP BY u.id LIMIT 1) AS availability
        con.query(locationSql, (err, region_details) => {
            if (!err && region_details.length > 0) {

                // (SELECT price FROM tbl_plan WHERE user_id = u.id AND expertise_id IN ('${request.expertise_id}') ORDER BY price ASC LIMIT 1) as price,
                var guideSql = `SELECT u.id,u.id as guide_id, CONCAT('${process.env.S3_BUCKET_ROOT}','user/', u.profile_image)  AS profile_image,
                u.first_name, u.region_id,
                gcl.language_ids, e.expertise_ids,
                (SELECT AVG(rating) FROM tbl_rating WHERE guide_id = u.id LIMIT 1) AS avg_rating,
                (SELECT COUNT(id) FROM tbl_rating WHERE guide_id = u.id LIMIT 1) AS review_count,
                ${param_sql}
                    FROM tbl_user u
                    LEFT JOIN (
                            SELECT user_id, GROUP_CONCAT(language_id) AS language_ids
                            FROM tbl_guide_chosen_language
                            GROUP BY user_id ORDER BY language_ids desc
                            ) AS gcl ON u.id = gcl.user_id
                    LEFT JOIN (
							SELECT user_id, GROUP_CONCAT(activity_id) AS expertise_ids
                            FROM tbl_guide_chosen_expertise
                            GROUP BY user_id
                            ) AS e ON u.id = e.user_id
                    LEFT JOIN tbl_guide_details gd ON u.id = gd.user_id
                WHERE u.is_active = '1' AND u.is_delete = '0' AND approval_status = '1' AND u.region_id = '${region_details[0].id}'
                AND (SELECT count(*) FROM tbl_availability
                    WHERE (
                        CASE
                        WHEN chosen_frequency = 'daily' THEN 1
                        WHEN chosen_frequency = 'weekly' AND week_day = LOWER(DAYNAME('${current_date}')) THEN 1
                        WHEN chosen_frequency = 'monthly' AND DAY(available_date) = DAY('${current_date}') THEN 1
                        WHEN chosen_frequency = 'norepeat' AND available_date = '${current_date}' THEN 1
                        ELSE 0
                        END
                    ) = 1
                    AND is_delete = '0'
                    AND available_date <= '${current_date}' AND user_id = u.id AND start_time > '${current_time}') > 0
                GROUP BY u.id HAVING price > 0`

                // var guideSql = `SELECT u.id, CONCAT('${process.env.S3_BUCKET_ROOT}','user/', u.profile_image)  AS profile_image,
                //     u.first_name, u.region_id, 
                //     (SELECT AVG(rating) FROM tbl_rating WHERE guide_id = u.id LIMIT 1) AS avg_rating,
                //     (SELECT COUNT(id) FROM tbl_rating WHERE guide_id = u.id LIMIT 1) AS review_count,
                //     (SELECT price FROM tbl_plan WHERE user_id = u.id ORDER BY price ASC LIMIT 1) as price,
                //     (SELECT available_date FROM tbl_availability WHERE user_id = u.id GROUP BY u.id LIMIT 1) AS availability,
                //     (SELECT GROUP_CONCAT(language_id) FROM tbl_guide_chosen_language WHERE user_id = u.id GROUP BY u.id) AS language_ids,
                //     (SELECT GROUP_CONCAT(CONCAT('${process.env.S3_BUCKET_ROOT}','flag/', l.image) FROM tbl_language l JOIN tbl_guide_chosen_language gcl ON gcl.language_id = l.id WHERE gcl.user_id = u.id GROUP BY u.id) AS language_images,
                //     (SELECT GROUP_CONCAT(activity_id) FROM tbl_guide_chosen_expertise WHERE user_id = u.id and is_active = '1' and is_delete = '0' GROUP BY user_id) AS expertise_ids
                // FROM tbl_user u
                // LEFT JOIN tbl_guide_details gd ON u.id = gd.user_id
                // WHERE u.is_active = '1' AND u.is_delete = '0' AND approval_status = '1' AND u.region_id = '${region_details[0].id}'
                // AND (SELECT COUNT(id) FROM tbl_availability WHERE user_id = u.id ) > 0 
                // GROUP BY u.id HAVING price > 0`

                if (request.expertise_id != '' && request.expertise_id != undefined) {
                    guideSql += ` AND u.id IN (
                             SELECT user_id
                             FROM tbl_guide_chosen_expertise AS gce
                             JOIN tbl_expertise AS e ON gce.activity_id = e.id
                             WHERE e.id IN ('${request.expertise_id}')
                             )`
                    //  WHERE e.id = '${request.expertise_id}'
                }

                // Filter based on chat latest by preference
                if (request.chat_latest_by != '' && request.chat_latest_by != undefined && request.chat_latest_by != 'norepeat') {
                    let filterDate;
                    if (request.chat_latest_by == 'today') {
                        filterDate = moment().format('YYYY-MM-DD');
                    } else if (request.chat_latest_by == 'tomorrow') {
                        filterDate = moment().add(1, 'days').format('YYYY-MM-DD');
                    } else if (request.chat_latest_by == 'week') {
                        filterDate = moment().add(7, 'days').format('YYYY-MM-DD');
                    } else {
                        guideSql += ``
                    }
                    // guideSql += ` AND (SELECT id, available_date, start_time, end_time, chosen_frequency FROM tbl_availability
                    guideSql += ` AND (SELECT id FROM tbl_availability
                        WHERE (
                            CASE
                                WHEN chosen_frequency = 'daily' THEN 1
                                WHEN chosen_frequency = 'weekly' AND week_day = LOWER(DAYNAME('${filterDate}')) THEN 1
                                WHEN chosen_frequency = 'monthly' AND DAY(available_date) = DAY('${filterDate}') THEN 1
                                WHEN chosen_frequency = 'norepeat' AND available_date = '${filterDate}' THEN 1
                                ELSE 0
                            END
                        ) = 1
                        AND is_delete = '0'
                        AND available_date <= '${filterDate}' AND user_id = u.id AND end_time >= '${current_time}' > 0  limit 1) `
                }


                // Sort criteria
                const sortCriteria = request.sort_criteria || 'availability';

                if (sortCriteria === 'most_experienced') {
                    guideSql += ' ORDER BY gd.experience DESC';
                } else if (sortCriteria === 'best_rating') {
                    // guideSql += ` ORDER BY avg_rating DESC`;
                    guideSql += ` ORDER BY (SELECT AVG(rating) FROM tbl_rating WHERE guide_id = u.id) DESC`;
                } else if (sortCriteria === 'lowest_price') {
                    guideSql += ` ORDER BY price ASC`;

                    // guideSql += ` ORDER BY ${priceSql} ASC`
                    // priceSql
                } else if (sortCriteria === 'availability') {
                    guideSql += ` ORDER BY availability ASC`;
                    // let date = moment().format('YYYY-MM-DD');
                    // guideSql += `AND (SELECT id, available_date, start_time, end_time, chosen_frequency FROM tbl_availability
                    //             WHERE (
                    //                 CASE
                    //                     WHEN chosen_frequency = 'daily' THEN 1
                    //                     WHEN chosen_frequency = 'weekly' AND week_day = LOWER(DAYNAME('${date}')) THEN 1
                    //                     WHEN chosen_frequency = 'monthly' AND DAY(available_date) = DAY('${date}') THEN 1
                    //                     WHEN chosen_frequency = 'norepeat' AND available_date = '${date}' THEN 1
                    //                     ELSE 0
                    //                 END
                    //             ) = 1
                    //             AND is_delete = '0'
                    //             AND available_date <= '${date}' AND user_id = u.id AND end_time >= '${current_time}') > 0 )`;
                    // COUNT(DISTINCT gce.activity_id)
                } else if (sortCriteria === 'compatibility') {
                    // guideSql += ` ORDER BY ( SELECT COUNT(u.id) FROM tbl_guide_chosen_expertise gce WHERE gce.user_id = u.id AND gce.activity_id IN ('${request.expertise_id}')) GROUP by u.id DESC`;
                    guideSql += ` AND u.id IN (
                             SELECT user_id
                             FROM tbl_guide_chosen_expertise AS gce
                             JOIN tbl_expertise AS e ON gce.activity_id = e.id
                             WHERE e.id IN ('${request.expertise_id}')
                             )`;
                } else {
                    guideSql += ` ORDER BY u.first_name ASC`;
                }


                // Pagination
                // const pageSize = request.limit || 10;
                // const currentPage = request.page || 1;
                // const offset = (currentPage - 1) * pageSize; 

                // const paginatedGuideSql = `${guideSql} LIMIT ${pageSize} OFFSET ${offset}`;
                // var sql = `SELECT * FROM tbl_user WHERE status = 'Active' "+where+" ORDER BY first_name ASC LIMIT " + ((req.page - 1) * globals.per_page) + ", " + globals.per_page + "`
                const paginatedGuideSql = `${guideSql} LIMIT ${((request.page - 1) * process.env.per_page) + ", " + process.env.per_page}`;

                // console.log('paginatedSSql............==========================================', paginatedGuideSql)

                con.query(paginatedGuideSql, (err, guideResult) => {
                    if (!err && guideResult.length > 0) {
                        var user_list = []; var row = 0;
                        asyncLoop(guideResult, (item, next) => {
                            user.languageDetails(item, (language_data) => {
                                item.language_data = language_data;
                                // const sql = `SELECT start_time, end_time FROM tbl_availability WHERE user_id = ${item.id} AND available_date = CURDATE()`;
                                const sql = `SELECT start_time, end_time FROM tbl_availability
                                    WHERE (
                                        CASE
                                            WHEN chosen_frequency = 'daily' THEN 1
                                            WHEN chosen_frequency = 'weekly' AND week_day = LOWER(DAYNAME('${current_date}')) THEN 1
                                            WHEN chosen_frequency = 'monthly' AND DAY(available_date) = DAY('${current_date}') THEN 1
                                            WHEN chosen_frequency = 'norepeat' AND available_date = '${current_date}' THEN 1
                                            ELSE 0
                                        END
                                    ) = 1
                                    AND is_delete = '0'
                                    AND available_date <= '${current_date}' AND user_id = '${item.id}' AND start_time > '${current_time}' order by available_date desc limit 1`;
                                con.query(sql, (err, result) => {
                                    if (!err && result.length > 0) {
                                        const remainder = 10 - (moment(result[0].start_time, 'HH:mm:ss').minute() % 10);
                                        var answer_latest_by_time = moment(result[0].start_time, 'HH:mm:ss').add(30, 'minutes').add(remainder, "minutes").format('HH:mm')
                                        item.answer_latest_by = answer_latest_by_time;
                                        user_list[row] = item;
                                        row++;
                                        next();
                                    } else {
                                        next();
                                    }
                                });
                            });
                        }, () => {
                            const totalCount = user_list.length;
                            const response = {
                                user_data: user_list,
                                total_count: totalCount
                            };
                            callback("1", { keywords: 'success_message', content: {} }, response);
                        });
                    } else {
                        callback("0", { keywords: 'data_not_found', content: {} }, null);
                    }
                });
            } else {
                callback("0", { keywords: 'service_is_not_provided_in_the_given_region', content: {} }, null);
            }
        });
    },

    // Function for getting guide details.
    guideDetails: (request, user_id, callback) => {
        const userResponse = {};
        user.userDetails(request, (user_data) => {
            if (user_data != null) {
                userResponse.user_data = user_data;

                user.expertiseDetails(request, (expertise_data) => {
                    userResponse.expertise_data = expertise_data;

                    user.languageDetails(request, (language_data) => {
                        userResponse.language_data = language_data;

                        user.availabilityDetails(request, (availability_data) => {
                            userResponse.availability_data = availability_data;

                            user.ratingDetails(request, (rating_data) => {
                                userResponse.rating_data = rating_data;

                                user.answerLatestBy(request, (answer_latest_by) => {
                                    userResponse.answer_latest_by = answer_latest_by;

                                    // check whether the guide in guideDetails is booked by the user or not. if it is booked then give the booking id in response.
                                    var sql = `SELECT id FROM tbl_booking WHERE user_id = '${request.user_id}' AND guide_id = '${request.guide_id}' AND booking_status IN ('confirmed', 'live')`;
                                    con.query(sql, (err, result) => {
                                        if (!err && result.length > 0) {
                                            userResponse.booking_id = result[0].id;
                                        } else {
                                            userResponse.booking_id = '';
                                        }
                                        callback("1", { keywords: 'success_message', content: {} }, userResponse);
                                    })


                                    // callback("1", { keywords: 'success_message', content: {} }, userResponse);

                                    // callback("1", { keywords: 'success_message', content: {} }, userResponse);
                                })
                            });

                        });

                    });

                });
            } else {
                callback("0", { keywords: 'failed_to_get_guide_details', content: {} }, null);
            }
        });
    },

    // Function for getting guide profile.
    guideProfile: (request, user_id, callback) => {
        const guideProfileData = {};
        if (user_id != null && user_id != undefined) {
            user.getUserGuideDetails(request, user_id, (guide_data) => {
                if (guide_data != null) {
                    guideProfileData.guide_data = guide_data;

                    user.expertiseByGuide(request, user_id, (expertise_data) => {
                        guideProfileData.expertise_data = expertise_data;

                        user.knownLanguageByGuide(user_id, (language_data) => {
                            guideProfileData.language_data = language_data;

                            user.guideAvailability(request, user_id, (availability_data) => {
                                guideProfileData.availability_data = availability_data;

                                user.guideRatingDetails(request, user_id, (rating_data) => {
                                    guideProfileData.rating_data = rating_data;

                                    // user.planDetails(user_id, (plan_data) => {
                                    //     guideProfileData.plan_data = plan_data;
                                    callback('1', { keywords: 'success_message', content: {} }, guideProfileData);

                                    // });
                                })
                            })
                        })
                    })
                } else {
                    callback('0', { keywords: 'failed_to_get_guide_profile', content: {} }, null);
                }
            });
        } else {
            callback('0', { keywords: 'missing_user_id', content: {} }, null);
        }
    },

    // Function for getting plan Details.
    seePlan: (request, callback) => {
        // const planSql = `SELECT * FROM tbl_plan WHERE user_id = ${request.guide_id} AND id = ${request.id}`
        const planSql = `SELECT * FROM tbl_plan WHERE user_id = ${request.guide_id}`
        con.query(planSql, (err, result) => {
            if (!err && result.length > 0) {
                callback('1', { keywords: 'success_message', content: {} }, result);
            } else {
                callback('0', { keywords: 'failed_to_get_plan_details', content: {} }, null);
            }
        })
    },

    // Function for getting ratings & reviews.
    getRatingsAndReviews: (request, user_id, callback) => {
        const offset = (request.page - 1) * request.limit; // Calculate the offset based on the page and limit
        // (SELECT AVG(rating) AS avg_rating FROM tbl_rating WHERE guide_id = ${user_id}) AS avg_rating,
        // (SELECT COUNT(*) AS total_reviews_count FROM tbl_rating WHERE guide_id = ${user_id}) AS total_reviews_count
        const sql = `SELECT r.id, r.user_id, CONCAT('${process.env.S3_BUCKET_ROOT}','user/', u.profile_image) AS profile_image, u.first_name, r.rating, r.review, r.create_at
        FROM tbl_rating r
        JOIN tbl_user u ON u.id = r.user_id
        WHERE r.guide_id = ${request.guide_id}
        LIMIT ${request.limit} OFFSET ${offset}`;

        con.query(sql, (err, result) => {
            if (!err && result.length > 0) {
                var rating_data = result;
                const avgRatingsAndReviewsCountSql = `SELECT 
                (SELECT AVG(rating) AS avg_rating FROM tbl_rating WHERE guide_id = ${request.guide_id}) AS avg_rating,
                (SELECT COUNT(*) AS total_reviews_count FROM tbl_rating WHERE guide_id = ${request.guide_id}) AS total_reviews_count`
                con.query(avgRatingsAndReviewsCountSql, (err, result) => {
                    if (!err && result.length > 0) {
                        callback('1', { keywords: 'success_message', content: {} }, { avgRatingsAndReviewsCountSql: result, ratingList: rating_data });
                    } else {
                        callback('2', { keywords: 'failed_to_get_avgRatingAndReviewsCount', content: {} }, null);
                    }
                })
            } else {
                callback('2', { keywords: 'no_rating_data_found', content: {} }, null);
            }
        })
    },

    // function for selecting plan before booking(basically in which plan user wants to book guide. Also in which expertise.)
    selectPlan: (request, user_id, callback) => {
        var sql = `INSERT INTO tbl_customer_chosen_plan SET ?`;
        var values = {
            user_id: user_id,
            guide_id: request.guide_id,
            activity_id: request.activity_id,
            plan_id: request.plan_id
        };
        con.query(sql, values, (err, result) => {
            if (!err && result.affectedRows > 0) {
                user.getPlanDetails(request, (plan_data) => {
                    if (plan_data) {
                        callback('1', { keywords: 'success_message', content: {} }, { plan_data: plan_data });
                    } else {
                        callback('0', { keywords: 'failed_to_get_plan_details', content: {} }, null);
                    }
                });
                // callback('1', { keywords: 'success_message', content: {} }, result)
            } else {

                callback('0', { keywords: 'failed_to_select_plan', content: {} }, null);
            }
        });
    },

    // function for fetching plan details.
    getPlanDetails: (request, callback) => {
        var sql = `SELECT * FROM tbl_plan WHERE id = ${request.plan_id}`;
        con.query(sql, (err, result) => {
            if (!err && result.length > 0) {
                var plan_data = result[0];
                callback(plan_data);
            } else {
                callback(null);
            }
        });
    },


    // Function for booking a guide. 
    bookGuide: (request, user_id, callback) => {
        common.get_setting_details('admin_commission', function (commission_percentage) {
            var admin_commission = (parseFloat(request.total_amount) * commission_percentage) / 100;
            var guide_commission = (parseFloat(request.total_amount) - (admin_commission)).toFixed(2);

            var insertobjact = {
                user_id: user_id,
                guide_id: request.guide_id,
                plan_id: request.plan_id,
                activity_id: request.activity_id,
                availability_id: request.availability_id,
                region_id: request.region_id,
                additional_info: request.additional_info,
                payment_type: request.payment_type,
                payment_status: 'completed',
                card_id: request.card_id,
                total_amount: request.total_amount,
                booking_status: "confirmed",
                admin_commission: admin_commission,
                guide_commission: guide_commission,
            };
            var insertquerry = `INSERT INTO tbl_booking set ?`
            con.query(insertquerry, [insertobjact], (err, result) => {
                if (!err && result.affectedRows > 0) {
                    var booking_id = result.insertId;
                    request.booking_id = booking_id;
                    user.paymet_method_function(request, function (transaction_id, cardmsg) {
                        if (transaction_id != null) {
                            con.query('update tbl_booking SET transaction_id = "' + transaction_id + '" WHERE id="' + booking_id + '"', (err, result) => {
                                if (!err) {
                                    user.getBookingDetails(booking_id, (booking_data) => {
                                        if (booking_data != null) {

                                            // PUSH NOTIFICATION.....
                                            var push_message = {
                                                title: "Booking guide",
                                                message: `You Have Booking From ${booking_data[0].sender_name} `,
                                                action_id: booking_data[0].id,
                                                notification_tag: 'new_guide_booking',
                                            }
                                            const push_data = {
                                                alert: { title: "Book for your", body: push_message.message },
                                                custom: {
                                                    title: "book for guide",
                                                    body: push_message.message,
                                                    message: push_message,
                                                    action_id: booking_data[0].id,
                                                    notification_tag: 'new_guide_booking',
                                                },

                                                topic: globals.BUNDLE_ID,
                                                priority: 'high'
                                            };

                                            var notification_params = {

                                                add_notification: 'Yes',
                                                action_id: booking_data[0].id,
                                                sender_id: booking_data[0].user_id,
                                                receiver_id: booking_data[0].guide_id,
                                                notification_tag: 'new_guide_booking',
                                                message: push_message.message,
                                                sender_type: "user",
                                                title: "book for guide",
                                                status: "New Booking guide",
                                                receiver_type: "guide"
                                            }
                                            common.send_notification(push_data, notification_params);

                                            var sql = `INSERT INTO tbl_chat_room (booking_id, sender_type, receiver_type, sender_id, receiver_id) VALUES(${request.booking_id}, 'user', 'guide', ${user_id}, ${request.guide_id})`
                                            con.query(sql, (err, result) => {
                                                if (!err && result.affectedRows > 0) {
                                                    callback('1', { keywords: 'success_message', content: {} }, booking_data);
                                                } else {
                                                    callback('0', { keywords: 'failed_to_book_guide', content: {} }, null);
                                                }
                                            });
                                        } else {
                                            callback('0', { keywords: 'failed_to_book_guide', content: {} }, null);
                                        }
                                    });
                                } else {
                                    callback('0', { keywords: 'failed_to_book_guide', content: {} }, null);
                                }
                            });
                        } else {
                            con.query('DELETE FROM tbl_booking WHERE id = "' + booking_id + '"', (err, result) => {
                                callback('0', { keywords: cardmsg, content: {} }, null);
                            })
                        }
                    });
                } else {
                    callback('0', { keywords: 'failed_to_book_guide', content: {} }, null);
                }
            });
        });
    },


    getBookingDetails: (booking_id, callback) => {
        // var sql = `SELECT *, id as booking_id FROM tbl_booking WHERE id = ${booking_id}`;
        var sql = `SELECT u.id,concat(u.first_name," ",u.last_name) as sender_name,b.id as booking_id,u2.id,concat(u2.first_name," ",u2.last_name) as reciver_name,u.user_type,b.* FROM tbl_booking as b JOIN tbl_user as u on b.user_id=u.id JOIN tbl_user as u2 ON b.guide_id = u2.id WHERE b.id= ${booking_id}`;
        con.query(sql, (err, result) => {
            if (!err && result.length > 0) {
                callback(result)
            } else {
                callback(null)
            }
        })
    },


    /**
     * Stripe Using booking of create chage and guide will be book
      @param {} booking_id 
      @param {} callback 
    */
    paymet_method_function: (request, callback) => {
        if (request.payment_type == 'c') {
            var sql = `SELECT * FROM tbl_card WHERE id = ${request.card_id} AND is_active = '1' AND is_delete = '0'`
            con.query(sql, function (err, cardresult) {
                if (!err && cardresult.length > 0) {
                    const currency = 'USD';
                    const payment_object = {
                        amount: Math.round(request.total_amount * 100),
                        customer: cardresult[0].customer_id,
                        currency: currency.toLowerCase(),
                        description: 'For Booking #' + request.booking_id,
                    };
                    custome_stripe.createStripeCharge(payment_object, (code, msg, response) => {
                        if (code == '0') {

                            callback(null, msg);
                        } else {
                            callback(response.id);
                        }
                    });
                } else {
                    callback(null, 'card not found');
                }
            });
        } else {
            custome_stripe.capturePaymentIntent(request.transaction_id, (code, msg, response) => {
                if (code == '0') {
                    if(request.payment_type == 'a'){
                        callback(null, 'Failed to open apple pay');
                    } else if(request.payment_type == 'g'){
                        callback(null, 'Failed to open google pay');
                    }
                } else {
                    callback(request.transaction_id)
                }
            });
        }
    },

    // Function for getting Booking details.
    bookingDetails: (request, user_id, callback) => {
        // CONCAT('${process.env.S3_BUCKET_ROOT}','user/', u.profile_image) AS profile_image,
        // u.first_name
        // (SELECT concat('${process.env.S3_BUCKET_ROOT}', 'user/', u.profile_image) AS profile_image FROM tbl_user u WHERE u.id = b.guide_id) AS profile_image,
        // (SELECT u.first_name from tbl_user u where u.id = b.guide_id) AS first_name,
        // (SELECT COUNT(*) FROM tbl_rating r WHERE b.user_id = r.user_id) AS is_rated,
        var sql = `SELECT
        b.*,
        CONCAT('${process.env.S3_BUCKET_ROOT}', 'user/', IF(b.user_id = '${user_id}', u2.profile_image, u1.profile_image)) AS profile_image,
        IF(b.user_id = '${user_id}', u2.first_name, u1.first_name) AS first_name,
        IF(b.is_requested = '1', IF(b.request_user_id = '${user_id}', 0, 1), 0) AS is_requested,
        IF(b.request_status = '1', IF(0, b.request_user_id = '${user_id}', 1), 0) AS request_status,
        IF(b.is_summary_ready = '0', IF(0, b.request_user_id = '${user_id}', 1), 0) AS summary_show_message,
        IF(b.title = '' AND b.summary = '', 0, 1) AS is_chat_closed,
        IFNULL(rating_data.is_rated, 0) AS is_rated,
        rating_data.rating AS rating,
        rating_data.review AS review,
        u2.email AS email,
        u2.mobile_number AS mobile_number,
        b.title,
        b.summary,
        b.activity_id,
        e.activity,
        b.plan_id,
        p.plan_name
    FROM
        tbl_booking b
    JOIN
        tbl_expertise e ON b.activity_id = e.id
    JOIN
        tbl_plan p ON b.plan_id = p.id
    LEFT JOIN
        tbl_user u1 ON b.user_id = u1.id
    JOIN
        tbl_user u2 ON b.guide_id = u2.id
    LEFT JOIN
        (
            SELECT
                booking_id,
                COUNT(*) AS is_rated,
                MAX(rating) AS rating,
                MAX(review) AS review
            FROM
                tbl_rating
            GROUP BY
                booking_id
        ) rating_data ON b.id = rating_data.booking_id
    WHERE
        b.id = ${request.booking_id};
    `;
        // console.log('sql............', sql)
        con.query(sql, (err, result) => {
            if (!err && result.length > 0) {

                user.getChatRoomDetails({ booking_id: request.booking_id }, (chatRoomData) => {
                    callback('1', { keywords: 'success_message', content: {} }, { 'booking_result': result, 'chatRoomData': chatRoomData });
                })

            } else {
                callback('0', { keywords: 'failed_to_get_booking_details', content: {} }, null);
            }
        })
    },


    // function for fetching chat room details.
    getChatRoomDetails: (request, callback) => {
        var sql = `SELECT * FROM tbl_chat_room WHERE booking_id = '${request.booking_id}'`
        con.query(sql, (err, result) => {
            if (!err && result.length > 0) {
                var data = {
                    chat_room_id: result[0].id,
                    booking_id: result[0].booking_id,
                    sender_type: result[0].sender_type,
                    receiver_type: result[0].receiver_type,
                    sender_id: result[0].sender_id,
                    receiver_id: result[0].receiver_id,
                }
                callback(data)
            } else {
                callback(null)
            }
        })
    },



    // Function for adding new card.

    addNewCard: function (request, callback) {
        var query = con.query("SELECT * FROM tbl_user WHERE id = '" + request.user_id + "' ", function (error, userdetials) {
            if (!error && userdetials.length > 0) {

                var cardobject = {
                    name: request.name_on_card,
                    number: request.card_number,
                    exp_month: request.exp_month,
                    exp_year: request.exp_year,
                    cvc: request.cvc,
                };
                custome_stripe.createCardToken(cardobject, function (code, msg, token) {
                    if (token != null) {
                        con.query("SELECT * FROM tbl_card WHERE is_delete='0' AND user_id='" + request.user_id + "' AND fingerprint='" + token.card.fingerprint + "'", function (err, result) {
                            if (!err && result.length > 0) {
                                callback("0", { keywords: 'text_card_already_exists', content: {} }, null);
                            } else {
                                con.query("SELECT * FROM tbl_card WHERE user_id = '" + request.user_id + "' and is_delete='0' ", function (err, card_data, fields) {
                                    if (!err) {
                                        var cardparams =
                                        {
                                            user_id: request.user_id,
                                            fingerprint: token.card.fingerprint,
                                            card_id: token.card.id,
                                            card_token: token.id,
                                            card_type: token.card.brand,
                                            card_number: token.card.last4,
                                            card_holder: request.name_on_card,
                                            expiry_date: request.exp_month + "/" + request.exp_year,
                                        };
                                        con.query("insert into tbl_card SET ?", [cardparams], function (err, result) {
                                            if (!err) {
                                                var customerObject = {
                                                    source: token.id,
                                                    email: userdetials[0].email,
                                                    description: process.env.APP_NAME + " User #" + request.user_id,
                                                };
                                                custome_stripe.createCustomer(customerObject, (customer) => {
                                                    if (customer == null) {
                                                        con.query("DELETE  FROM tbl_card WHERE id='"+result.insertId+"'", function(err_del, result_del){
                                                            callback("0", { keywords: 'customermsg_notfound', content: {} }, null);
                                                        })
                                                    } else {
                                                        var query = con.query("UPDATE tbl_card set customer_id='" + customer.id + "'  where id=" + result.insertId + " ", function (upderror) {
                                                            if (!upderror) {
                                                                con.query(`select * from tbl_card where id = ${result.insertId} and is_active = '1' and is_delete ='0'`, function (err, result) {
                                                                    if (!err) {
                                                                        callback("1", { keywords: 'text_card_add_succ', content: {} }, result);
                                                                    } else {
                                                                        callback("0", { keywords: msg, content: {} }, null);
                                                                    }
                                                                });
                                                            } else {
                                                                callback("0", { keywords: 'text_card_details_notfound', content: {} }, null);
                                                            }
                                                        });
                                                    }
                                                });

                                            } else {
                                                callback("0", { keywords: 'text_card_already_exists', content: {} }, null);
                                            }
                                        });

                                    } else {
                                        callback("0", { keywords: 'test_userdetailsnot_found', content: {} }, null);
                                    }
                                });
                            }
                        });
                    } else {
                        // callback("0", { keywords: "text_token_null", content: {} }, null);
                        callback("0", { keywords: msg, content: {} }, null);
                    }
                });
            } else {
                callback("3", { keywords: 'test_userdetailsnot_found', content: {} }, null);
            }
        });
    },

    /*
addNewCard: (request, user_id, callback) => {
    user.checkCard(request, user_id, (isExist) => {
        if (isExist) {
            callback('0', { keywords: 'card_already_exist', content: {} }, null);
        } else {
            var sql = `INSERT INTO tbl_card SET ?`;
            var cardData = {
                user_id: user_id,
                // card_company_name: request.card_company_name,
                card_number: request.card_number,
                name_on_card: request.name_on_card,
                expiry_month: request.expiry_month,
                expiry_year: request.expiry_year,
                cvv: request.cvv,
            };
            con.query(sql, cardData, (err, result) => {
                if (!err && result.affectedRows > 0) {
                    var id = result.insertId;
                    const sql = `SELECT * FROM tbl_card WHERE is_active = '1' AND is_delete = '0' AND id = ${id} AND user_id = ${user_id}`;
                    con.query(sql, (err, result) => {
                        if (!err && result.length > 0) {
                            callback('1', { keywords: 'success_message', content: {} }, result);
                        } else {
                            callback('0', { keywords: 'failed_to_get_card_details', content: {} }, null);
                        }
                    });
                } else {
                    callback('0', { keywords: 'failed_to_add_card', content: {} }, null);
                }
            });
        }
    });
},
*/

    // function for (soft deleting) deleting card.
    deleteCard: (request, user_id, callback) => {
        const deleteSql = `UPDATE tbl_card SET is_delete = '1', is_active = '0' WHERE id = ${request.card_id} AND user_id = ${user_id}`;
        con.query(deleteSql, (err, result) => {
            if (!err && result.affectedRows > 0) {
                callback('1', { keywords: 'success_message', content: {} }, true);
                // const sql = `SELECT * FROM tbl_card WHERE is_delete = '0' AND is_active = '1' AND user_id = ${user_id}`;
                // con.query(sql, (err, result) => {
                //     if (!err && result.length > 0) {
                //         console.log("aaaaaaaaaaaaaaaaa",result);
                //     } else {
                //         console.log("not error ----------------------------->",err)
                //         callback('2', { keywords: 'card_not_found', content: {} }, null);
                //     }
                // });
            } else {
                callback('0', { keywords: 'failed_to_delete_card_details', content: {} }, null);
            }
        });
    },

    // Function for getting card details.
    getCardList: (request, user_id, callback) => {
        var sql = `SELECT id, card_number, card_holder, expiry_date FROM tbl_card WHERE user_id = ${user_id} AND is_delete = '0' AND is_active = '1'`;
        con.query(sql, (err, result) => {
            if (!err && result.length > 0) {
                callback('1', { keywords: 'success_message', content: {} }, result);
            } else {
                callback('0', { keywords: 'failed_to_get_card_details', content: {} }, null);
            }
        });
    },

    // Function for getting notification list.
    getNotification: (user_id, callback) => {
        /*
        var sql = `SELECT n.id,n.message,
        CASE
            WHEN (TIMESTAMPDIFF(SECOND,n.create_at,CURRENT_TIMESTAMP())) < 60 THEN CONCAT(TIMESTAMPDIFF(SECOND,n.create_at,CURRENT_TIMESTAMP()) ,' seconds ago')
            WHEN (TIMESTAMPDIFF(MINUTE,n.create_at,CURRENT_TIMESTAMP())) < 60 THEN CONCAT(TIMESTAMPDIFF(MINUTE,n.create_at,CURRENT_TIMESTAMP()) ,' minutes ago')
            WHEN (TIMESTAMPDIFF(HOUR,n.create_at,CURRENT_TIMESTAMP())) < 24 THEN DATE_FORMAT(n.create_at, "%h:%i %p")
            WHEN ((TIMESTAMPDIFF(HOUR,n.create_at,CURRENT_TIMESTAMP())) > 24  AND (TIMESTAMPDIFF(HOUR,n.create_at,CURRENT_TIMESTAMP())) < 48) THEN "Yesterday"
            WHEN (TIMESTAMPDIFF(DAY,n.create_at,CURRENT_TIMESTAMP())) < 31 THEN CONCAT(TIMESTAMPDIFF(DAY,n.create_at,CURRENT_TIMESTAMP()),' days ago')
            WHEN (TIMESTAMPDIFF(MONTH,n.create_at,CURRENT_TIMESTAMP())) < 12 THEN CONCAT(TIMESTAMPDIFF(MONTH,n.create_at,CURRENT_TIMESTAMP()), ' months ago')
            ELSE CONCAT(TIMESTAMPDIFF(YEAR,n.create_at,CURRENT_TIMESTAMP()),' years ago')
        END AS notification_time
        FROM tbl_notification n WHERE n.user_id = ${user_id}`;
        */
        const notificationSql = `SELECT * FROM tbl_notification WHERE receiver_id = ${user_id} ORDER BY id DESC `
        con.query(notificationSql, (err, result) => {
            if (!err && result.length > 0) {
                con.query("UPDATE tbl_notification SET is_read='1' WHERE receiver_id = '" + user_id + "'", function (err_read, result_read) {
                    var notification_data = result;
                    callback("1", { keywords: 'success_message', content: {} }, notification_data);
                })
            } else {
                callback("0", { keywords: 'notification_data_not_found', content: {} }, null);
            }
        });
    },

    // Function for adding Ratings & Reviews (With Push Notification).
    addRatingReview: (request, user_id, callback) => {
        var sql = `INSERT INTO tbl_rating SET ?`;
        var values = {
            user_id: user_id,
            booking_id: request.booking_id,
            guide_id: request.guide_id,
            rating: request.rating,
            review: (request.review) ? request.review : '',
        }
        con.query(sql, values, (err, result) => {
            if (!err && result.affectedRows > 0) {
                var rating_id = result.insertId;
                user.ratingReviewDetails(rating_id, (ratingData) => {
                    if (ratingData != null) {
                        console.log('ratingData', ratingData)
                        var push_message = {
                            title: "Rating and review",
                            message: `${ratingData[0].sender_name} Give You rating `,
                            action_id: request.booking_id,
                            notification_tag: 'New Rating & Review',
                        }
                        console.log("push_message", push_message)
                        const push_data = {
                            alert: { title: "Rating and review", body: push_message.message },
                            custom: {
                                title: "Rating and review",
                                body: push_message.message,
                                message: push_message,
                                action_id: request.booking_id,
                                notification_tag: 'new_rating_review',
                            },
                            topic: globals.BUNDLE_ID,
                            priority: 'high'
                        };
                        var notification_params = {
                            add_notification: 'Yes',
                            action_id: request.booking_id,
                            sender_id: ratingData[0].user_id,
                            receiver_id: ratingData[0].guide_id,
                            notification_tag: 'new_rating_review',
                            message: push_message.message,
                            sender_type: "user",
                            title: "Rating and review",
                            receiver_type: "guide",
                            status: "New Rating and Review",
                        }
                        common.send_notification(push_data, notification_params);
                        callback('1', { keywords: 'success_message', content: {} }, ratingData)
                    } else {
                        callback('0', { keywords: 'failed_to_get_rating_review', content: {} }, null)
                    }
                });
            } else {
                callback('0', { keywords: 'failed_to_add_rating_review', content: {} }, null);
            }
        });
    },

    /**
     * Stripe Payment
     * @param {*} request 
     * @param {*} callback 
     */

    /**
     *  create3DSecurePayment in Using Stripe :
     * Date : 01/08/2023
     *
     * @param {*} request 
     * @param {*} user_id 
     * @param {*} switch 
     */

    create3DSecurePayment: (request, callback) => {
        con.query("SELECT email,first_name,id FROM tbl_user WHERE id='" + request.user_id + "'", (err, user_result) => {
            if (!err && user_result[0] != undefined) {
                // con.query("SELECT * FROM tbl_card WHERE id='" + request.card_id + "'", function (err, card_result) {
                //     if (!err && card_result[0] != undefined) {

                //         request.paymentMethodId = card_result[0].card_id;
                //         request.customer = card_result[0].customer_id;
                request.receipt_email = user_result[0].email;
                request.description = "Payment For user #" + request.user_id;

                custome_stripe.create3DSecurePayment(request, function (response, msg, code) {
                    if (response != null) {
                        callback('1', { keywords: 'Success', content: {} }, response);

                    } else {
                        callback('0', { keywords: msg, content: {} }, null);
                    }
                });
                //     } else {
                //         // callback(null, t('text_card_details_notfound'), 2);
                //         callback('2', { keywords: 'text_card_details_notfound', content: {} }, null);
                //     }
                // });
            } else {
                // callback(null, t('text_customer_not_found'), 0);
                callback('0', { keywords: 'text_customer_not_found', content: {} }, null);

            }
        });
    },

    mypaymant: (request, callback) => {
        //         var sql = `SELECT u.id AS guide_id, b.user_id AS user_id,b.id AS booking_id,
        //     CONCAT('${process.env.S3_BUCKET_ROOT}', 'user/', u.profile_image) AS profile_image,b.total_amount,b.payment_status,
        //     (SELECT first_name FROM tbl_user u1 WHERE u1.id = b.user_id) AS first_name,
        //     (SELECT id FROM tbl_chat_room cr WHERE cr.booking_id = b.id LIMIT 1) AS chat_room_id,
        //     (SELECT gce.activity_id FROM tbl_guide_chosen_expertise gce WHERE gce.activity_id = b.activity_id LIMIT 1) AS activity_id,
        //     (SELECT e.activity FROM tbl_guide_chosen_expertise gce JOIN tbl_expertise e ON e.id = gce.activity_id WHERE gce.activity_id = b.activity_id LIMIT 1) AS activity,
        //     (SELECT p.id FROM tbl_plan p WHERE p.user_id = b.guide_id LIMIT 1) AS plan_id,
        //     (SELECT p.plan_name FROM tbl_plan p WHERE p.user_id = b.guide_id LIMIT 1) AS plan_name,
        //     b.booking_status
        // FROM tbl_booking b
        // JOIN tbl_user u ON u.id = b.guide_id
        // WHERE b.user_id IN (SELECT user_id FROM tbl_booking WHERE guide_id = ${request.user_id})
        // GROUP BY b.id order by b.id DESC`;

        var sql = `SELECT u.id AS guide_id, b.user_id AS user_id,b.id AS booking_id, b.plan_id, b.activity_id, b.booking_status,b.total_amount,b.payment_status,
            (SELECT first_name FROM tbl_user u1 WHERE u1.id = b.user_id) AS first_name,
            (SELECT concat('${process.env.S3_BUCKET_ROOT}', 'user/', u.profile_image) AS profile_image FROM tbl_user u WHERE u.id = b.user_id) AS profile_image,
            (SELECT id FROM tbl_chat_room WHERE booking_id = b.id LIMIT 1) AS chat_room_id,
            (SELECT activity FROM tbl_expertise WHERE id = b.activity_id) AS activity,
            (SELECT p.plan_name FROM tbl_plan p WHERE b.plan_id = p.id) AS plan_name
        FROM tbl_booking b
        JOIN tbl_user u ON u.id = b.guide_id
        WHERE b.user_id IN (SELECT user_id FROM tbl_booking WHERE guide_id = ${request.user_id}) AND u.is_active = '1' AND u.is_delete = '0'
        GROUP BY b.id order by b.id DESC`;


        con.query(sql, (err, pay_list) => {
            if (!err && pay_list.length > 0) {
                callback('1', { keywords: 'Success', content: {} }, pay_list);
            } else {
                callback('0', { keywords: 'keyword_data_error', content: {} }, null);
            }
        });
    }


};

module.exports = user;
