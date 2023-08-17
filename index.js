require('dotenv').config();
const io = require('socket.io')(process.env.SOCKET_PORT);
// var chat_model = require("./model/v1/chat/chat_model")
const express = require('express');
var app = express();

app.use(express.text());
app.use(express.urlencoded({ extended: false }));

app.use("/v1/api_document/", require('./model/v1/api_document/index'))

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

// for creating routes.
const auth = require('./model/v1/auth/route');
const user = require('./model/v1/user/route');
const Chat = require('./model/v1/chat/chat_route');
const middleware = require('./middleware/validation');
const common = require('./config/common');

// middleware routes.
app.use('/', require('./middleware/validation').extractHeaderLanguage);
app.use('/', require('./middleware/validation').validateApiKey);
app.use('/', require('./middleware/validation').validateHeaderToken);

// actual route paths.
app.use('/api/v1/auth', auth);
// app.use('/api/v1/guide', guide);
app.use('/api/v1/chat', Chat);
app.use('/api/v1/user', user);

const chat = require('./model/v1/chat/chat_model');
const user_model = require('./model/v1/user/user_models');
var con = require('./config/database');
var globals = require('./config/constant');


// for Chat server.
try {
    server = app.listen(process.env.PORT)
    console.log('Your Chat connection is on PORT :', process.env.PORT);
    const io = require('socket.io')(server, {
        cors: {
            origin: '*',
        }
    })

    let users = {}
    var sock = io.of('socket').on('connection', (socket) => {
        let user_id = socket.handshake.query.user_id

        users[user_id] = {
            socket: socket.id,
        };

        // socket for sending message.
  	    socket.on('send_message', (req, res) => {
            middleware.decryption(req, (request) => {
                var user_id = request.sender_id;
                console.log('user_iduser_iduser_iduser_iduser_iduser_iduser_iduser_iduser_iduser_iduser_iduser_iduser_id',user_id);
                chat.sendMessage(request, user_id, (code, message, data) => {
                    if (data != null) {
                        var receiver_id = request.receiver_id;
                        console.log('users[receiver_id]users[receiver_id]users[receiver_id]users[receiver_id]users[receiver_id]users[receiver_id]users[receiver_id]', users[receiver_id]);
                        console.log('users[receiver_id]users[receiver_id]users[receiver_id]users[receiver_id]users[receiver_id]users[receiver_id]users[receiver_id]', receiver_id);
                        if (users[receiver_id] != undefined) {
                            var responseData = { code: code, message: message, data: { data } }
                            con.query("UPDATE tbl_chat SET is_read='1' WHERE is_read='0' AND chat_room_id='"+data[0].chat_room_id+"' AND receiver_id='"+receiver_id+"'", function(rece_err, recce_result){
                                middleware.encryption(responseData, (response) => {
                                    socket.to(users[user_id]['socket']).emit('send_message', response);
                                    socket.to(users[receiver_id]['socket']).emit('send_message', response);
                                });
                            })
                        } else {
                            var sender_type = request.sender_type;
                            var receiver_type = request.receiver_type;
                            var push_message = {
                                title: "New message",
                                message: `${data[0].sender_name} Sent You message `,
                                action_id: data[0].chat_room_id,
                                notification_tag: 'new_message',
                            }
                            console.log("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",receiver_id)
                            console.log("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",responseData)
                            const push_data = {
                                
                                alert: { title: "new_chat", body: push_message.message },
                                custom: {
                                    title: "New message",
                                    body: push_message.message,
                                    message: push_message,
                                    action_id: data[0].booking_id,
                                    notification_tag: 'new_message',
                                },
                                topic: process.env.BUNDLE_ID,
                                priority: 'high'
                            };
                            var notification_params = {
                                add_notification: 'Yes',
                                action_id: data[0].booking_id,
                                sender_id: data[0].sender_id,
                                receiver_id: data[0].receiver_id,
                                notification_tag: 'new_message',
                                message: push_message.message,
                                sender_type: sender_type,
                                title: "New message",
                                receiver_type: receiver_type,
                                status:"new_message",
                            };
                            common.send_notification(push_data, notification_params);

                            var responseData = { code: code, message: message, data: { data } }
                            middleware.encryption(responseData, (response) => {
                                socket.to(users[user_id]['socket']).emit('send_message', response)
                            })
                        }
                    } else {
                        console.log('datatata nulllllllllllllllllllllllllll', data);
                        var responseData = { code: code, message: message, data: { data } }
                        middleware.encryption(responseData, (response) => {
                            socket.to(users[user_id]['socket']).emit('send_message', response)
                        })
                    }
                })
            })
        });

        // socket for 'typing' thing in chats.
        socket.on('typing', (req, res) => {
            middleware.decryption(req, (request) => {
                // logic when ids are find
                if (request.user_id != undefined && request.chat_room_id != undefined) {
                    var receiver_id = request.receiver_id;
                    if (request.is_typing == 1) {
                        // Typing start event
                        var response = {
                            user_id: request.user_id,
                            chat_room_id: request.chat_room_id,
                            is_typing: request.is_typing,
                        };
                        var responseData = { code: '1', message: 'Typing...', data: response };
                        middleware.encryption(responseData, (response) => {
                            // sock.emit('typing', response);
                            socket.to(users[receiver_id]['socket']).emit('typing', response)
                        });
                    } else {
                        // Typing end event
                        var response = {
                            user_id: request.user_id,
                            chat_room_id: request.chat_room_id,
                            is_typing: request.is_typing,
                        };
                        var responseData = { code: '1', message: '', data: response };
                        middleware.encryption(responseData, (response) => {
                            // sock.emit('typing', response);
                            socket.to(users[receiver_id]['socket']).emit('typing', response)
                        });
                    }
                } else {
                    // logic for when ids are not find.
                    var responseData = { code: '0', message: 'Invalid request', data: {} };
                    middleware.encryption(responseData, (response) => {
                        socket.to(users[receiver_id]['socket']).emit('typing', response)
                        // sock.emit('typing', response);
                    });
                }
            });
        });

        // socket.on('check_status', (req, res)=> {
        //     middleware.decryption(req, (request) => {
        //         var responseData;
        //         console.log('check_status_request', request);
        //         if(request.receiver_id != undefined && users[request.receiver_id] != undefined){
        //             responseData = { code: '1', message: 'Data found', data: {'is_online':1} };
        //         } else {
        //             responseData = { code: '1', message: 'Data found', data: {'is_online':0} };
        //         }
        //         middleware.encryption(responseData, (response) => {
        //             console.log(response);
        //             console.log(responseData);
        //             console.log(users[request.sender_id]['socket']);
        //             socket.to(users[request.sender_id]['socket']).emit('check_status', response)
        //         });
        //     })
        // })
        socket.on('check_status', (req) => {
            middleware.decryption(req, (request) => {
                var responseData;
                console.log('check_status_request', request);
                console.log('check_status_request_socket_id', users[request.receiver_id]);
        
                if (request.receiver_id !== undefined && users[request.receiver_id] !== undefined) {
                    responseData = { code: '1', message: 'Data found', data: { 'is_online': 1 } };
                } else {
                    responseData = { code: '1', message: 'Data found', data: { 'is_online': 0 } };
                }
        
                middleware.encryption(responseData, (response) => {
                    console.log(response);
                    console.log(responseData);
        
                    // Assuming 'users' contains sender information and their corresponding socket IDs
                    console.log("users[request.sender_id]['socket']", users[request.sender_id]['socket']);
                    console.log("request.sender_id", users[request.sender_id]);
                    if (users[request.sender_id] && users[request.sender_id]['socket']) {
                        sock.to(users[request.sender_id]['socket']).emit('check_status', response);
                    } else {
                        console.log(`Sender with ID ${request.sender_id} not found or no associated socket.`);
                    }
                });
            });
        });

        socket.on('finalizeSummaryRequest', (req) => {
            middleware.decryption(req, (request) => {
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
                        if (!err) {
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
                            if(users[receiver_id]['socket'] == undefined){
                                common.send_notification(push_data, notification_params);
                                user_model.bookingDetails(request, receiver_id, function(code, msg, bookingDetailsData){
                                    var responseData = { code: '1', message: 'Data found', data: bookingDetailsData };
                                    middleware.encryption(responseData, (response) => {
                                        sock.to(users[sender_id]['socket']).emit('finalizeSummaryRequest', response);
                                    })
                                })
                            } else {
                                user_model.bookingDetails(request, receiver_id, function(code, msg, bookingDetailsData){
                                    var responseData = { code: '1', message: 'Data found', data: bookingDetailsData };
                                    middleware.encryption(responseData, (response) => {
                                        sock.to(users[sender_id]['socket']).emit('finalizeSummaryRequest', response);
                                    })
                                })
                            }
                        } else {
                            console.log(err);
                            var responseData = { code: '0', message: 'Data not found', data: null };
                            middleware.encryption(responseData, (response) => {
                                sock.to(users[sender_id]['socket']).emit('finalizeSummaryRequest', response);
                            })
                        }
                    })
                })
            });
            // });
        });

        // For disocnnect socket
        socket.on('disconnect', () => {
            for (var user_id in users) {
                if (users[user_id].socket === socket.id) {
                    delete users[user_id];
                    break;
                }
            }
        });
    })

} catch (error) {
    console.log('Failed to start Chat server', error)
}
