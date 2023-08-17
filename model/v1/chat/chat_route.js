var express = require('express');
var router = express.Router();
var guide = require('../../../model/v1/auth/auth_model');
var middleware = require('../../../middleware/validation');
var chat = require('./chat_model');

/*----------------------------------- Chat ----------------------------------------*/

// define a route for getting chat room details.
router.post('/getChatRoomDetails', (req, res) => {
    middleware.decryption(req.body, (request) => {
        var rules = {
            // chat_room_id: 'required|numeric'
            booking_id: 'required'
        }
        var messages = {
            required: req.language.required_message,
            numeric: req.language.numeric_message,
        }
        if (middleware.checkvalidationRule(request, res, rules, messages)) {
            chat.getChatRoomDetails(request, (code, message, data) => {
                middleware.send_response(req, res, code, message, data);
            })
        }
    })
})

// define a route for getting chat list. (user/guide have chatted with)
// router.get('/chat_list', (req, res) => {
//     middleware.decryption(req.body, (request) => {
//         var user_id = req.user_id
//         chat.chatList(request, user_id, (code, message, data) => {
//             middleware.send_response(req, res, code, message, data);
//         })
//     })
// })
router.post('/chat_list', (req, res) => {
    middleware.decryption(req.body, (request) => {
        var user_id = req.user_id
        var rules = {
            user_type: 'required'
        }
        var messages = {
            required: req.language.required_message,
        }
        if (middleware.checkvalidationRule(request, res, rules, messages)) {
            chat.chatList(request, user_id, (code, message, data) => {
                middleware.send_response(req, res, code, message, data);

            })
        }
    })
})

// define a route for getting hisoty list. (user/guide have chatted with in the past.)
// router.get('/history_list', (req, res) => {
//     middleware.decryption(req.body, (request) => {
//         var user_id = req.user_id
//         chat.historyList(request, user_id, (code, message, data) => {
//             middleware.send_response(req, res, code, message, data);
//         })
//     })
// })
router.post('/history_list', (req, res) => {
    middleware.decryption(req.body, (request) => {
        var user_id = req.user_id
        var rules = {
            user_type: 'required'
        }
        var messages = {
            required: req.language.required_message,
        }
        if (middleware.checkvalidationRule(request, res, rules, messages)) {
            chat.historyList(request, user_id, (code, message, data) => {
                middleware.send_response(req, res, code, message, data);

            })
        }
    })
})

// define a route for sending message.
router.post('/send_message', (req, res) => {
    middleware.decryption(req.body, (request) => {
        var user_id = req.user_id
        var rules = {
            chat_room_id: 'required|numeric',
            sender_id: 'required|numeric',
            sender_type: 'required|in:user,guide,admin',
            receiver_id: 'required|numeric',
            receiver_type: 'required|in:user,guide,admin',
            message: 'required|string',
            message_type: 'required|in:text,image,video,audio,location,document',
        }
        var messages = {
            required: req.language.required_message,
            string: req.language.string_message,
            numeric: req.language.numeric_message,
            in: req.language.in_message
        }
        if (middleware.checkvalidationRule(request, res, rules, messages)) {
            chat.sendMessage(request, user_id, (code, message, data) => {
                middleware.send_response(req, res, code, message, data);
            })
        }
    })
})

// define a route for getting chat history.
router.post('/chat_history', (req, res) => {
    middleware.decryption(req.body, (request) => {
        var user_id = req.user_id
        var rules = {
            chat_room_id: 'required|numeric'
        }
        var messages = {
            required: req.language.required_message,
        }
        if (middleware.checkvalidationRule(request, res, rules, messages)) {
            chat.chatHistory(request, user_id, (code, message, data) => {
                middleware.send_response(req, res, code, message, data);
            })
        }
    })
})

// define a route for sending 'finalize summary request'.
router.post('/finalize_summary_request', (req, res) => {
    middleware.decryption(req.body, (request) => {
        var user_id = req.user_id
        var rules = {
            booking_id: 'required|numeric',
            //chat_room_id: 'required|numeric',
        }
        var message = {
            required: req.language.required_message,
            numeric: req.language.numeric_message,
        }
        if (middleware.checkvalidationRule(request, res, rules, message)) {
            chat.finalizeSummaryRequest(request, user_id, (code, message, data) => {
                middleware.send_response(req, res, code, message, data);
            })
        }
    })
})

// define a route for approve/decline request.
router.post('/approve_decline_request', (req, res) => {
    middleware.decryption(req.body, (request) => {
        var rules = {
            user_id: 'required|numeric',
            booking_id: 'required|numeric',
            request_type: 'required|in:approve,decline'
        }
        var message = {
            required: req.language.required_message,
            in: req.language.in_message
        }
        if (middleware.checkvalidationRule(request, res, rules, message)) {
            chat.approveDeclineRequest(request, (code, message, data) => {
                middleware.send_response(req, res, code, message, data);
            })
        }
    })
})

// define a route for finalize summary request.
router.post('/finalizeSummary', (req, res) => {
    middleware.decryption(req.body, (request) => {
        var rules = {
            user_id: 'required|numeric',
            booking_id: 'required|numeric',
            title: 'required|string',
            summary: 'required|string',
        }
        var messages = {
            required: req.language.required_message,
            string: req.language.string_message,
            numeric: req.language.numeric_message,
        }
        if (middleware.checkvalidationRule(request, res, rules, messages)) {
            chat.finalizeSummary(request, (code, message, data) => {
                middleware.send_response(req, res, code, message, data);
            })
        }
    })
})


module.exports = router;