var con = require('../../../config/database');
var asyncLoop = require('node-async-loop');
var moment = require('moment');
var common = require('../../../config/common');
var globals = require('../../../config/common');



const chat = {

    // function for fetching data from chat room id.
    // getChatData: (request, user_id, callback) => {
    //     const chatSql = `SELECT *, CONVERT(message USING utf8) AS message_given FROM tbl_chat WHERE chat_room_id = ${request.chat_room_id}`;
    //     con.query(chatSql, (err, result) => {
    //         if (!err && result.length > 0) {
    //             callback(result);
    //         } else {
    //             callback(false)
    //         }
    //     });
    // },
    getChatData: (request, chat_id, callback) => {
        // const chatSql = `SELECT *, (CASE WHEN message_type = 'text' THEN CONVERT(message USING utf8) ELSE CONCAT('${process.env.S3_BUCKET_ROOT}', 'chat_image/', CONVERT(message USING utf8)) END) AS message_given FROM tbl_chat WHERE chat_room_id = ${request.chat_room_id} AND id = ${chat_id}`;
        const chatsql = `SELECT c.*,(SELECT booking_id FROM tbl_chat_room WHERE id=${request.chat_room_id}) as booking_id,
            (CASE WHEN c.message_type = 'text' THEN CONVERT(c.message USING utf8)
            ELSE CONCAT('https://guidaapp.s3.eu-north-1.amazonaws.com/chat_image/', CONVERT(c.message USING utf8))
            END) AS message_given,
            (SELECT u_sender.first_name FROM tbl_user u_sender WHERE u_sender.id = c.sender_id) AS sender_name,
            (SELECT u_receiver.first_name FROM tbl_user u_receiver WHERE u_receiver.id = c.receiver_id) AS receiver_name
            FROM tbl_chat AS c
            JOIN tbl_user AS u ON c.sender_id = u.id
            WHERE c.chat_room_id = ${request.chat_room_id} AND c.id = ${chat_id}`
        con.query(chatsql, (err, result) => {
            if (!err && result.length > 0) {
                callback(result);
            } else {
                callback(false)
            }
        });
    },

    // finalizeSummaryRequestData function.
    finalizeSummaryRequestData: (request, user_id, callback) => {
        const requestSql = `SELECT * FROM tbl_booking WHERE id = ${request.booking_id}`;
        con.query(requestSql, (err, result) => {
            if (!err && result.length > 0) {
                callback(result[0]);
            } else {
                callback(null);
            }
        });
    },

    // update booking_status = 'live' when 'guide' has repliied to 'user' once or more.
    updateBookingStatus: (request, callback) => {
        var sql = `UPDATE tbl_booking SET booking_status = 'live' WHERE id = '${request.booking_id}'
        AND (SELECT COUNT(*) FROM tbl_chat WHERE chat_room_id = '${request.chat_room_id}' AND sender_id = '${request.sender_id}') > 0`
        con.query(sql, (err, result) => {
            if (!err && result.affectedRows > 0) {
                callback(true)
            } else {
                callback(false)
            }
        })
    },

    // getChatRoomDetails function.
    getChatRoomDetails: (request, callback) => {
        var sql = `SELECT * FROM tbl_chat_room WHERE booking_id = '${request.booking_id}'`
        con.query(sql, (err, result) => {
            if (!err && result.length > 0) {
                callback(result[0])
            } else {
                callback([])
            }
        })
    },

    // chatRoomDetails funciton.
    chatRoomDetails: (request, user_id, callback) => {
        asyncLoop(request, (item, next) => {
            var sql = `SELECT * FROM tbl_chat_room WHERE booking_id = '${item.booking_id}'`
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
                    callback([])
                }
            })
        })
    },

    /*--------------------------------------------------- Chat -----------------------------------------------------*/

    // function for getting chat list.
    chatList: (request, user_id, callback) => {
        if (request.user_type == 'user') {

            // (SELECT concat('${process.env.S3_BUCKET_ROOT}', 'user/', u.profile_image) AS profile_image FROM tbl_user u WHERE u.id = b.guide_id) AS profile_image
            // CONCAT('${process.env.S3_BUCKET_ROOT}', 'user/', u.profile_image) AS profile_image

            var chatListSql = `SELECT
            u.id AS guide_id,
            b.user_id AS user_id,
            b.id AS booking_id,
            b.plan_id,
            b.activity_id,
            b.booking_status,
            (SELECT u.first_name FROM tbl_user u WHERE u.id = b.guide_id) AS first_name,
            (SELECT concat('${process.env.S3_BUCKET_ROOT}', 'user/', u.profile_image) AS profile_image FROM tbl_user u WHERE u.id = b.guide_id) AS profile_image,
            (SELECT id FROM tbl_chat_room WHERE booking_id = b.id LIMIT 1) AS chat_room_id,
            (SELECT activity FROM tbl_expertise WHERE id = b.activity_id) AS activity,
            (SELECT p.plan_name FROM tbl_plan p WHERE b.plan_id = p.id) AS plan_name,
            (SELECT rating FROM tbl_rating r WHERE r.booking_id = b.id LIMIT 1) AS rating,
            (SELECT COUNT(id) FROM tbl_rating r WHERE r.booking_id = b.id LIMIT 1) AS is_rated,
            CASE WHEN b.title = '' AND b.summary = '' THEN 0 ELSE 1 END AS is_chat_closed,
            (SELECT COUNT(c.id) FROM tbl_chat AS c LEFT JOIN tbl_chat_room AS tcr ON tcr.id = c.chat_room_id WHERE tcr.booking_id = b.id AND c.sender_id != ${user_id} AND c.is_read = '0' LIMIT 1) AS message_count,
            b.summaryInsertDate
        FROM
            tbl_booking b
        JOIN
            tbl_user u ON u.id = b.guide_id
        WHERE
            b.user_id = ${user_id}
            AND b.booking_status IN ('confirmed', 'live')
            AND b.is_delete = '0'
            AND b.is_active = '1'
            AND u.is_delete = '0'
            AND b.user_id IN (SELECT user_id FROM tbl_booking WHERE user_id = ${user_id})
        GROUP BY
            b.id
        ORDER BY
            b.create_at DESC
        `
            // GROUP BY b.id`;


            con.query(chatListSql, (err, result) => {
                // console.log('chat_listtttttttttttttttttttttttt',chatListSql);
                if (!err && result.length > 0) {

                    if (result.booking_status === 'confirmed') {

                        asyncLoop(result, (item, next) => {

                            let current_date = moment().format('YYYY-MM-DD');
                            let current_time = moment().format('HH:mm:ss');
                            // const sql = ` SELECT start_time, end_time FROM tbl_availability WHERE user_id = ${item.id} AND available_date = CURDATE() AND is_delete = '0' AND available_date <= CURDATE() AND start_time > CURTIME() ORDER BY available_date DESC LIMIT 1`;

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
                                    AND available_date <= '${current_date}' AND user_id = '${item.user_id}' AND start_time > '${current_time}' order by available_date desc limit 1`;

                            con.query(sql, (err, result) => {
                                if (!err && result.length > 0) {
                                    const remainder = 10 - (moment(result[0].start_time, 'HH:mm:ss').minute() % 10);
                                    var answer_latest_by_time = moment(result[0].start_time, 'HH:mm:ss').add(30, 'minutes').add(remainder, "minutes").format('HH:mm')

                                    item.answer_latest_by = answer_latest_by_time;
                                    next()
                                } else {
                                    // Case: No availability for the user today
                                    item.answer_latest_by = '00:00:00';
                                    next()
                                }

                                chat.chatRoomDetails(result, user_id, (chat_room_details) => {
                                    callback('1', { keywords: 'success_message', content: {} }, { 'chat_list_result': result, 'chat_room_details': chat_room_details });
                                })



                            });
                        }, () => {
                            callback('1', { keywords: 'success_message', content: {} }, result);
                        });

                    } else {
                        callback('1', { keywords: 'success_message', content: {} }, result)
                        // })

                    }

                    // callback('1', { keywords: 'success_message', content: {} }, result)
                } else {
                    // Case: Error or no chat list found
                    callback('2', { keywords: 'data_not_found', content: {} }, null);
                }
            });


        } else if (request.user_type == 'guide') {
            // if user is 'guide'

            // (SELECT concat('${process.env.S3_BUCKET_ROOT}', 'user/', u.profile_image) AS profile_image FROM tbl_user u WHERE u.id = b.guide_id) AS profile_image


            // CONCAT('${process.env.S3_BUCKET_ROOT}', 'user/', u.profile_image) AS profile_image,
            var chatListSql = `SELECT
            u.id AS guide_id,
            b.user_id AS user_id,
            b.id AS booking_id,
            b.plan_id,
            b.activity_id,
            b.booking_status,
            (SELECT u.first_name FROM tbl_user u WHERE u.id = b.user_id) AS first_name,
            (SELECT concat('${process.env.S3_BUCKET_ROOT}', 'user/', u.profile_image) AS profile_image FROM tbl_user u WHERE u.id = b.user_id) AS profile_image,
            (SELECT id FROM tbl_chat_room WHERE booking_id = b.id LIMIT 1) AS chat_room_id,
            (SELECT activity FROM tbl_expertise WHERE id = b.activity_id) AS activity,
            (SELECT p.plan_name FROM tbl_plan p WHERE b.plan_id = p.id) AS plan_name,
            (SELECT rating FROM tbl_rating r WHERE r.booking_id = b.id LIMIT 1) AS rating,
            (SELECT COUNT(id) FROM tbl_rating r WHERE r.booking_id = b.id LIMIT 1) AS is_rated,
            CASE WHEN b.title = '' AND b.summary = '' THEN 0 ELSE 1 END AS is_chat_closed,
            (SELECT COUNT(c.id) FROM tbl_chat AS c LEFT JOIN tbl_chat_room AS tcr ON tcr.id = c.chat_room_id WHERE tcr.booking_id = b.id AND c.sender_id != ${user_id} AND c.is_read = '0' LIMIT 1) AS message_count,
            b.summaryInsertDate
        FROM
            tbl_booking b
        JOIN
            tbl_user u ON u.id = b.guide_id
        WHERE
            b.guide_id = ${user_id}
            AND b.booking_status IN ('confirmed', 'live')
            AND b.is_delete = '0'
            AND b.is_active = '1'
            AND u.is_delete = '0'
            AND b.user_id IN (SELECT user_id FROM tbl_booking WHERE guide_id = ${user_id})
        GROUP BY
            b.id
        ORDER BY
            b.create_at DESC
        `;


            con.query(chatListSql, (err, result) => {
                // console.log('chat_listtttttttttttttttttttttttt',chatListSql);

                if (!err && result.length > 0) {

                    if (result.booking_status === 'confirmed') {

                        let count = 0;
                        asyncLoop(result, (item, next) => {

                            let current_date = moment().format('YYYY-MM-DD');
                            let current_time = moment().format('HH:mm:ss');
                            // const sql = ` SELECT start_time, end_time FROM tbl_availability WHERE user_id = ${item.id} AND available_date = CURDATE() AND is_delete = '0' AND available_date <= CURDATE() AND start_time > CURTIME() ORDER BY available_date DESC LIMIT 1`;

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
                                    AND available_date <= '${current_date}' AND user_id = '${item.user_id}' AND start_time > '${current_time}' order by available_date desc limit 1`;

                            con.query(sql, (err, result) => {

                                if (!err && result.length > 0) {
                                    const remainder = 10 - (moment(result[0].start_time, 'HH:mm:ss').minute() % 10);
                                    var answer_latest_by_time = moment(result[0].start_time, 'HH:mm:ss').add(30, 'minutes').add(remainder, "minutes").format('HH:mm')

                                    item.answer_latest_by = answer_latest_by_time;
                                    next()
                                } else {
                                    // Case: No availability for the user today
                                    item.answer_latest_by = '00:00:00';
                                    next()
                                }
                            })
                        }, () => {
                            callback('1', { keywords: 'success_message', content: {} }, result);
                        });

                    } else {
                        callback('1', { keywords: 'success_message', content: {} }, result)
                    }
                } else {
                    // Case: Error or no chat list found
                    callback('2', { keywords: 'data_not_found', content: {} }, null);
                }

            });

        } else {
            callback('0', { keywords: 'invalid_user_type', content: {} }, null);
        }

    },

    // Function for getting chat history list. 
    historyList: (request, user_id, callback) => {
        if (request.user_type == 'user') {
            // (SELECT AVG(rating) FROM tbl_rating r WHERE r.guide_id = b.guide_id limit 1) AS rating,
            // CASE WHEN (SELECT COUNT(*) FROM tbl_rating r WHERE b.guide_id = r.user_id AND b.user_id = ${user_id}) THEN 1 ELSE 0 END AS is_rated,
            var historySql = `SELECT
            u.id AS guide_id,
            b.user_id AS user_id,
            b.id AS booking_id,
            b.plan_id,
            b.activity_id,
            b.booking_status,
            (SELECT u.first_name FROM tbl_user u WHERE u.id = b.guide_id) AS first_name,
            (SELECT concat('${process.env.S3_BUCKET_ROOT}', 'user/', u.profile_image) AS profile_image FROM tbl_user u WHERE u.id = b.guide_id) AS profile_image,
            (SELECT id FROM tbl_chat_room WHERE booking_id = b.id LIMIT 1) AS chat_room_id,
            (SELECT activity FROM tbl_expertise WHERE id = b.activity_id) AS activity,
            (SELECT p.plan_name FROM tbl_plan p WHERE b.plan_id = p.id) AS plan_name,
            (SELECT rating FROM tbl_rating r WHERE r.booking_id = b.id LIMIT 1) AS rating,
            (SELECT COUNT(id) FROM tbl_rating r WHERE r.booking_id = b.id LIMIT 1) AS is_rated,
            CASE WHEN b.title = '' AND b.summary = '' THEN 0 ELSE 1 END AS is_chat_closed,
            b.summaryInsertDate
        FROM
            tbl_booking b
        JOIN
            tbl_user u ON u.id = b.guide_id
        WHERE
            b.user_id = ${user_id}
            AND b.booking_status = 'close'
            AND b.is_delete = '0'
            AND b.is_active = '1'
            AND u.is_delete = '0'
            AND b.user_id IN (SELECT user_id FROM tbl_booking WHERE user_id = ${user_id})
        GROUP BY
            b.id
        ORDER BY
            b.create_at DESC;
        `
            
            con.query(historySql, (err, result) => {
                if (!err && result.length > 0) {
                    callback('1', { keywords: 'success_message', content: {} }, result);
                } else {
                    callback('2', { keywords: 'data_not_found', content: {} }, null);
                }
            })
        } else {

            var historySql = `SELECT
            u.id AS guide_id,
            b.user_id AS user_id,
            b.id AS booking_id,
            b.plan_id,
            b.activity_id,
            b.booking_status,
            (SELECT u.first_name FROM tbl_user u WHERE u.id = b.user_id) AS first_name,
            (SELECT concat('${process.env.S3_BUCKET_ROOT}', 'user/', u.profile_image) AS profile_image FROM tbl_user u WHERE u.id = b.user_id) AS profile_image,
            (SELECT id FROM tbl_chat_room WHERE booking_id = b.id LIMIT 1) AS chat_room_id,
            (SELECT activity FROM tbl_expertise WHERE id = b.activity_id) AS activity,
            (SELECT p.plan_name FROM tbl_plan p WHERE b.plan_id = p.id) AS plan_name,
            (SELECT rating FROM tbl_rating r WHERE r.booking_id = b.id LIMIT 1) AS rating,
            (SELECT COUNT(id) FROM tbl_rating r WHERE r.booking_id = b.id LIMIT 1) AS is_rated,
            CASE WHEN b.title = '' AND b.summary = '' THEN 0 ELSE 1 END AS is_chat_closed,
            b.summaryInsertDate
        FROM
            tbl_booking b
        JOIN
            tbl_user u ON u.id = b.guide_id
        WHERE
            b.guide_id = ${user_id}
            AND b.booking_status = 'close'
            AND b.is_delete = '0'
            AND b.is_active = '1'
            AND u.is_delete = '0'
            AND b.user_id IN (SELECT user_id FROM tbl_booking WHERE guide_id = ${user_id})
        GROUP BY
            b.id
        ORDER BY
            b.create_at DESC;
        `

            con.query(historySql, (err, result) => {
                if (!err && result.length > 0) {
                    callback('1', { keywords: 'success_message', content: {} }, result);
                } else {
                    callback('2', { keywords: 'data_not_found', content: {} }, null);
                }
            })
        }
    },

    // Function for sending messages.
    sendMessage: (request, user_id, callback) => {
        var chatSql = `INSERT INTO tbl_chat SET ?`;
        const values = {
            chat_room_id: request.chat_room_id,
            sender_id: request.sender_id,
            sender_type: request.sender_type,
            receiver_id: request.receiver_id,
            receiver_type: request.receiver_type,
            message: request.message,
            message_type: request.message_type
        }
        con.query(chatSql, values, (err, result) => {
            if (!err && result.affectedRows > 0) {
                var chat_id = result.insertId;

                // updateBookingStatus function call here.
                chat.updateBookingStatus(request, (err, result) => {
                    // chat.getChatData(request, user_id, (chatData) => {
                    chat.getChatData(request, chat_id, (chatData) => {
                        if (chatData) {
                            // con.query("UPDATE tbl_chat SET is_read='1' WHERE is_read='0' AND chat_room_id='"+request.chat_room_id+"'", function(rece_err, recce_result){
                                callback('1', { keywords: 'success_message', content: {} }, chatData);
                            // })
                        } else {
                            callback('0', { keywords: 'failed_to_get_chat_data', content: {} }, null);
                        }
                    })

                })
            } else {
                callback('0', { keywords: 'failed_to_send_message', content: {} }, null);
            }
        })
    },

    // Function for getting chat History.
    chatHistory: (request, user_id, callback) => {
        // SELECT *, (CASE WHEN message_type = 'text' THEN CONVERT(message USING utf8) ELSE image END) as message FROM tbl_chat WHERE message_type != 'text'
        // const sql = `SELECT *, CONVERT(message USING utf8) AS message_given FROM tbl_chat WHERE chat_room_id = ${request.chat_room_id} ORDER BY id ASC`;
        const sql = `SELECT *, (CASE WHEN message_type = 'text' THEN CONVERT(message USING utf8) ELSE CONCAT('${process.env.S3_BUCKET_ROOT}', 'chat_image/', CONVERT(message USING utf8)) END) AS message_given FROM tbl_chat WHERE chat_room_id = ${request.chat_room_id} ORDER BY id DESC`;
        con.query(sql, (err, result) => {
            if (!err && result.length > 0) {
                // callback('1', { keywords: 'success_message', content: {} }, result);
                con.query("UPDATE tbl_chat SET is_read='1' WHERE chat_room_id = '" + request.chat_room_id + "'", function (err_read, result_read) {
                    callback('1', { keywords: 'success_message', content: {} }, result);
                })
            } else {
                callback('0', { keywords: 'failed_to_get_chat_history', content: {} }, null);
            }
        })
    },

    // Function for sending 'finalizeSummaryRequest'.     
    finalizeSummaryRequest: (request, user_id, callback) => {
        const sql = `UPDATE tbl_booking SET ? WHERE id = ${request.booking_id} AND (guide_id = ${user_id} OR user_id = ${user_id})`;
        const values = {
            is_requested: '1',
            request_status: '2',
            request_user_id: user_id
        }

        con.query(sql, values, (err, result) => {

            chat.booking_notification_data(request.booking_id, (summary_data) => {
                let sender_id = user_id == summary_data[0].user_id ? summary_data[0].user_id : summary_data[0].guide_id;
                let receiver_id = sender_id == summary_data[0].user_id ? summary_data[0].guide_id : summary_data[0].user_id;
                let sender_type = sender_id == summary_data[0].user_id ? 'user' : 'guide';
                let receiver_type = sender_type == 'user' ? 'guide' : 'user';
                if (!err && result.affectedRows > 0) {

                    // PUSH NOTIFICATION.....
                    var push_message = {
                        title: "Request for summary",
                        message: `${summary_data[0].sender_name} have a request for summary in chat`,
                        action_id: request.booking_id,
                        notification_tag: 'Summary_Reuest!',
                    };

                    const push_data = {
                        alert: { title: "Request for summary", body: push_message.message },
                        custom: {
                            title: "Request for summary",
                            body: push_message.message,
                            message: push_message,
                            action_id: request.booking_id,
                            notification_tag: 'Summary_Reuest!',
                        },

                        topic: globals.BUNDLE_ID,
                        priority: 'high'
                    };

                    var notification_params = {

                        add_notification: 'Yes',
                        action_id: request.booking_id,
                        sender_id: sender_id,
                        receiver_id: receiver_id,
                        notification_tag: 'Summary_Reuest!',
                        message: push_message.message,
                        sender_type: sender_type,
                        title: "Request for summary",
                        receiver_type: receiver_type,
                        status: "Summary_Reuest!",
                    }
                    common.send_notification(push_data, notification_params);

                    callback('1', { keywords: 'success_message', content: {} }, summary_data)
                } else {
                    callback('0', { keywords: 'failed_to_get_finalize_summary_request_data', content: {} }, null)
                }
            })
        })
    },

    booking_notification_data: (booking_id, callback) => {
        const requestSql = `SELECT u.id,concat(u.first_name," ",u.last_name) as sender_name,b.id as booking_id,u2.id,concat(u2.first_name," ",u2.last_name) as reciver_name,u.user_type,b.* FROM tbl_booking as b JOIN tbl_user as u on b.user_id=u.id JOIN tbl_user as u2 ON b.guide_id = u2.id WHERE b.id= ${booking_id}`;
        con.query(requestSql, (err, result) => {
            if (!err && result.length > 0) {
                callback(result);
            } else {
                callback(null);
            }
        });
    },

    // Function for updating 'approveDeclineRequest'. After 'guide' or 'user' click the button.
    approveDeclineRequest: (request, callback) => {
        if (request.request_type == "approve") {
            const sql = `UPDATE tbl_booking SET request_status = '1', is_requested = '0' WHERE id = ${request.booking_id} AND (guide_id = ${request.user_id} OR user_id = ${request.user_id})`;
            con.query(sql, (err, result) => {
                if (!err && result.affectedRows > 0) {
                    chat.booking_notification_data(request.booking_id, (data) => {
                        if (data != null) {
                            let sender_id = request.user_id == data[0].user_id ? data[0].user_id : data[0].guide_id;
                            let receiver_id = sender_id == data[0].user_id ? data[0].guide_id : data[0].user_id;
                            let sender_type = sender_id == data[0].user_id ? 'user' : 'guide';
                            let receiver_type = sender_type == 'user' ? 'guide' : 'user';
                            var push_message = {
                                title: "Summary approve",
                                message: `${data[0].sender_name} summary request is approve `,
                                action_id: data[0].id,
                                notification_tag: 'summary_approve',
                            }
                            const push_data = {
                                alert: { title: "Book for your", body: push_message.message },
                                custom: {
                                    title: "Summary approve",
                                    body: push_message.message,
                                    message: push_message,
                                    action_id: data[0].id,
                                    notification_tag: 'summary_approve',
                                },
                                topic: globals.BUNDLE_ID,
                                priority: 'high'
                            };
                            var notification_params = {
                                add_notification: 'Yes',
                                action_id: data[0].id,
                                sender_id: sender_id,
                                receiver_id: receiver_id,
                                notification_tag: 'summary_approve',
                                message: push_message.message,
                                sender_type: sender_type,
                                title: "Summary approve",
                                receiver_type: receiver_type,
                                status: "summary_approve",
                            }
                            common.send_notification(push_data, notification_params);

                            callback('1', { keywords: 'success_message', content: {} }, data)
                        } else {
                            callback('0', { keywords: 'failed_to_get_finalize_summary_request_data', content: {} }, null)
                        }
                    })
                } else {
                    callback('0', { keyword: 'failed_to_update_request_status', content: {} }, null)
                }
            })
        } else {
            const sql = `UPDATE tbl_booking SET request_status = '0', is_requested = '0' WHERE id = ${request.booking_id} AND (guide_id = ${request.user_id} OR user_id = ${request.user_id})`;
            con.query(sql, (err, result) => {
                if (!err && result.affectedRows > 0) {
                    chat.booking_notification_data(request.booking_id, (data) => {
                        let sender_id = request.user_id == data[0].user_id ? data[0].user_id : data[0].guide_id;
                        let receiver_id = sender_id == data[0].user_id ? data[0].guide_id : data[0].user_id;
                        let sender_type = sender_id == data[0].user_id ? 'user' : 'guide';
                        let receiver_type = sender_type == 'user' ? 'guide' : 'user';
                        if (data != null) {
                            var push_message = {
                                title: "Summary decline",
                                message: `${data[0].sender_name} summary request is decline `,
                                action_id: data[0].id,
                                notification_tag: 'summary_decline',
                            }
                            const push_data = {
                                alert: { title: "Book for your", body: push_message.message },
                                custom: {
                                    title: "Summary decline",
                                    body: push_message.message,
                                    message: push_message,
                                    action_id: data[0].id,
                                    notification_tag: 'summary_decline',
                                },
                                topic: globals.BUNDLE_ID,
                                priority: 'high'
                            };
                            var notification_params = {

                                add_notification: 'Yes',
                                action_id: data[0].id,
                                sender_id: sender_id,
                                receiver_id: receiver_id,
                                notification_tag: 'summary_decline',
                                message: push_message.message,
                                sender_type: sender_type,
                                title: "Summary decline",
                                receiver_type: receiver_type,
                                status: "summary_decline",
                            }
                            common.send_notification(push_data, notification_params);

                            callback('1', { keywords: 'success_message', content: {} }, data)
                        } else {
                            callback('0', { keywords: 'failed_to_get_finalize_summary_request_data', content: {} }, null)
                        }
                    })
                } else {
                    callback('0', { keyword: 'failed_to_update_request_status', content: {} }, null)
                }
            })
        }
    },

    //Function for 'finalizeSummary' details in chats. 
    finalizeSummary: (request, callback) => {
        const chatSummarySql = `UPDATE tbl_booking SET ? WHERE id = ${request.booking_id} AND (guide_id = ${request.user_id} OR user_id = ${request.user_id})`;
        const chatSummaryValues = {
            title: request.title,
            summary: request.summary,
            is_summary_ready: '1',
            // request_status: '0',
            booking_status: 'close',
        }
        con.query(chatSummarySql, [chatSummaryValues], (err, result) => {
            if (!err && result.affectedRows > 0) {
                chat.booking_notification_data(request.booking_id, (data) => {
                    let sender_id = request.user_id;
                    let receiver_id = data[0].user_id;
                    let sender_type = 'guide';
                    let receiver_type = 'user';
                    var push_message = {
                        title: "Finalize summary",
                        message: `${data[0].sender_name} send finalize summary `,
                        action_id: request.booking_id,
                        notification_tag: 'finalize_summary',
                    }
                    const push_data = {
                        alert: { title: "Finalize summary", body: push_message.message },
                        custom: {
                            title: "Finalize summary",
                            body: push_message.message,
                            message: push_message,
                            action_id: request.booking_id,
                            notification_tag: 'finalize_summary',
                        },

                        topic: globals.BUNDLE_ID,
                        priority: 'high'
                    };
                    var notification_params = {
                        add_notification: 'Yes',
                        action_id: request.booking_id,
                        sender_id: sender_id,
                        receiver_id: receiver_id,
                        notification_tag: 'finalize_summary',
                        message: push_message.message,
                        sender_type: sender_type,
                        title: "Finalize summary",
                        receiver_type: receiver_type,
                        status: "finalize_summary",
                    }
                    common.send_notification(push_data, notification_params);
                    if (data != null) {
                        callback('1', { keywords: 'success_message', content: {} }, data)
                    } else {
                        callback('0', { keywords: 'failed_to_get_finalize_summary_request_data', content: {} }, null)
                    }
                })
            } else {
                callback('0', { keywords: 'failed_to_update_chat_summary', content: {} }, null)
            }
        })
    },
}

module.exports = chat;
