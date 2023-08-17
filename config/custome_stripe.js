var constants = require('./constant.js');
// let stripe      = require('stripe')(process.env.STRIPE_API_KEY);
const stripe = require('stripe')(process.env.STRIPE_API_KEY);
var fs = require('fs');
var moment = require('moment');
const message = require('../language/en.js');

class Customstripe {

    /**
     * Function to generate token of card using stripe library
     * 17-07-2023
     * @param {Object Of Card Parameters} cardobject 
     * @param {Function} callback 
    */
    createCardToken(cardobject, callback) {
        stripe.tokens.create({
            card: cardobject
        }, function (err, token) {
            if (err) {
                callback('0', err.message, null);
            } else {
                callback('1', "Card Token Generation Success", token);
            }
        });
    }

    /**
     * Function to create customer using the token of stripe
     * 15-11-2019
     * @param {Customer Obejct} customerobject 
     * @param {Function} callback 
     */
    createCustomer(customerobject, callback) {
        stripe.customers.create(
            customerobject,
        function (err, customer) {

            if (err) {
                console.log('customer_create_errrrrrrrrr', err);
                callback(null);

            } else {
                callback(customer);
            }
        });
    }

    /**
     * Note : Without hold functionality. No need to capture it.
     * Function to transfer money from card to stripe platform account without destination
     * 15-11-2019
     * @param {Payment Object Of Stripe} paymentobject 
     * @param {Function} callback 
     */
    tranferStripePlatform(paymentobject, callback) {
        stripe.charges.create(paymentobject, function (errors, charge) {
            if (!errors && charge != undefined) {
                var charge = {
                    transaction_id: charge.id,
                    balance_transaction: charge.balance_transaction
                }
                callback('1', "Transfer success", charge);
            } else {
                callback('0', errors.message, null);
            }
        });
    }

    /**
     * Function to upload users identity to stripe
     * 23-01-2020
     * @param {Request Data} request 
     * @param {Function} callback 
     */
    uploadIdentityStripe(request, callback) {

        var fp = fs.readFileSync("./" + constants.BANK_IMAGE + request.bank_document);
        var file = {};
        stripe.files.create({
            purpose: 'identity_document',
            file: {
                data: fp,
                name: request.bank_document,
                type: 'application/octet-stream'
            }
        }, function (errors, fileUpload) {
            if (errors) {
                callback('0', errors.message, null);
            } else {
                file = fileUpload;
                callback('1', "File upload success", file);
            }
        });
    }

    /**
     * Function to create account on stripe
     * 23-01-2020
     * @param {Account Object} accountObject 
     * @param {Function} callback 
     */
    createAccount(accountObject, callback) {
        stripe.accounts.create(accountObject, function (errors, account) {
            if (!errors && account != undefined) {
                callback('1', "Account Created", account);
            } else {
                callback('0', errors.message, null);
            }
        });
    }

    /**
     * Function to create stripe charge [Note : if payment object contains capture parameter set to false than need to capture this charge]
     * @description This is not direct charge so transaction fees will be deducted from platform account [client account]
     * @param {Payment Object} paymentobject 
     * @param {Function} callback 
     */
    createStripeCharge(paymentobject,callback) {
        stripe.charges.create(paymentobject,function(err, charge) {
            if (!err && charge != undefined) {
                callback('1',"Charge Created",charge);
            } else {
                callback('0',err.message,null);
            }      
        });
    }
    
    /**
     * Function to capture the charge which is created with capture false otherwise no need for capture
     * @param {Intent ID} payment intent id 
     * @param {Function} callback 
     */
    capturePaymentIntent(payment_intent_id,callback) {
        stripe.paymentIntents.capture(payment_intent_id,function(err, charge) {
            if (!err && charge != undefined) {
                callback('1',"Charge Captured",charge);
            } else {
                callback('0',err.message,null);
            }
        });
    }

    /**
     * Function to refund the charge which is put on hold by stripe.charge method
     * @param {Charge ID} charge_id 
     * @param {Function} callback 
     */
    createChargeRefund(refundobject, callback) {
        stripe.refunds.create(refundobject, function (error, refund) {
            if (!error && refund != undefined) {
                callback('1', "Charge Refunded", refund);
            } else {
                callback('0', error.message, null);
            }
        });
    }

    /**
     * Function to transfer the amount to connected account by stripe.transfer method
     * @param {Charge ID} charge_id 
     * @param {Function} callback 
     */
    createTransfer(transferobject, callback) {
        stripe.transfers.create(transferobject, function (error, transfer) {
            if (!error && transfer != undefined) {
                callback('1', "Transfer success", transfer);
            } else {
                callback('0', error.message, null);
            }
        });
    }

    /**
     * Function to capture the charge which is created with capture false otherwise no need for capture
     * @param {Charge ID} charge_id 
     * @param {Function} callback 
     */
    createStripePayout(payout_object, callback) {
        stripe.payouts.create({
            'amount': Math.round(payout_object.amount * 100),
            'currency': 'USD',
            'method': payout_object.method,
            "destination": payout_object.bank_token,
            'description': "For Payout amount of " + payout_object.user_type + " #" + payout_object.user_id + " on " + moment().format("YYYY-MM-DD HH:mm:ss")
        }, {
            stripeAccount: payout_object.merchant_account_id,
        }, function (err, payout) {
            if (!err && payout != undefined) {
                callback('1', "payout success", payout);
            } else {
                callback('0', err.message, null);
            }
        });
    }

    /**
     * Function to get stripe account balance
     */
    getStripeAccountBalance(callback) {
        stripe.balance.retrieve(function (err, balance) {
            if (!err && balance != undefined) {
                callback('1', "balance success", balance);
            } else {
                callback('0', err.message, null);
            }
        });
    }

    create3DSecurePayment(requestobject, callback) {
        // Create new PaymentIntent
        stripe.paymentIntents.create({
            amount: parseFloat(requestobject.amount) * 100,
            currency: "USD",
            // payment_method: requestobject.paymentMethodId,
            // customer: requestobject.customer,
            payment_method_types: ['card'],
            payment_method_options:
            {
                "card": {
                    request_three_d_secure: "any"
                }
            },
            capture_method: 'manual',
            // confirm: true,
            // confirmation_method :  'manual',
            receipt_email: requestobject.receipt_email,
            description: requestobject.description,
            // use_stripe_sdk : true,
            // transfer_group : 'ORDER_96'
        }, function (err, intent) {
            if (err) {
                switch (err.type) {
                    case 'StripeCardError':
                        callback(null, err.message, 0);
                        break;
                    case 'StripeRateLimitError':
                        callback(null, err.message, 0);
                        break;
                    case 'StripeInvalidRequestError':
                        callback(null, err.message, 0);
                        break;
                    case 'StripeAPIError':
                        callback(null, err.message, 0);
                        break;
                    case 'StripeConnectionError':
                        callback(null, err.message, 0);
                        break;
                    case 'StripeAuthenticationError':
                        callback(null, err.message, 0);
                        break;
                    default:
                        callback(null, err.message, 0);
                        break;
                }
            } else {
                callback(intent, "data found", 1);
            }
        });
    }

}

// var stripeObj = new Customstripe();
module.exports = new Customstripe();
