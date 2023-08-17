var con = require('../../../config/database');
var globals = require('../../../config/constant');
var common = require('../../../config/common');
var asyncLoop = require('node-async-loop');
var datetime = require('node-datetime');
var date = datetime.create();
const momenttimezone = require('moment-timezone');
var cryptoLib = require('cryptlib');
var moment = require('moment');
var stripe = require('../../../config/custome_stripe');
// const { t } = require('localizify');
const custome_stripe = require('../../../config/custome_stripe');

// get an instance of the express Router
var Cron = {
    /*
    * Transfer amount to business wallet after 7 day for guide 
    */
    guide_settlement: function (currenttime, callback) {
        var dt = datetime.create();
        var date = dt.format('Y-m-d');
        // DATE(b.order_datetime) <= '"+last_settlement_date+"'
        con.query("SELECT b.*,sum(guide_commission) as settlement_amount FROM tbl_booking as b WHERE b.is_vendor_settled='0' GROUP BY b.guide_id HAVING settlement_amount > 0 order by b.guide_id DESC",function (err, result, fields){
            if(!err && result.length > 0) {
                asyncLoop(result, function (item, next) {
                    con.query("SELECT * FROM tbl_bank_details where user_id= '"+item.guide_id+"' AND is_active ='1' AND is_delete ='1'", function (err, bank_details, fields){ 
                        if (!err && bank_details[0] != undefined) {
                            var payment_object = {
                                amount: Math.round((item.settlement_amount) * 100),
                                currency: "USD",
                                destination : bank_details[0].merchant_account_id,
                                transfer_group : "Payout on "+currenttime,
                                description : "For Order #"+item.id,
                            };
                            stripe.createTransfer(payment_object,function(code,msg,response) {
                                if(code == '0') {
                                    next();
                                } else {
                                    var payout_object = {
                                        'user_id' : item.guide_id,
                                        'amount' : item.settlement_amount,
                                        'merchant_account_id' : bank_details[0].merchant_account_id,
                                        'bank_token' : bank_details[0].bank_token,
                                        'method' : 'standard',
                                    };
                                    stripe.createStripePayout(payout_object,function(code,msg,response) {
                                        if(code == '0') {
                                            next();
                                        } else {
                                            var insertdate = moment().format("YYYY-MM-DD HH:mm:ss");
                                            con.query("INSERT INTO tbl_settlement(guide_id,total_settlement_amount,settlement_date,transaction_id) VALUES ('"+item.guide_id+"','"+item.settlement_amount+"','"+date+"','"+response.id+"') RETURNING id", function(err, result, fields) {
                                                con.query("UPDATE tbl_booking SET is_vendor_settled='1' WHERE guide_id='"+item.guide_id+"' AND is_vendor_settled='0'",function (err) {
                                                    next();
                                                })
                                            })
                                        }
                                    });
                                }
                            });
                        } else {
                            next();
                        }
                    })
                }, function () {
                    callback(true)    
                });
            }else{
                callback(true);
            }
        });     
    },
}

module.exports = Cron;