var con = require('../../../config/database');
var GLOBALS = require('../../../config/constant');

var API = {

    /**
     * Function to get api users list
     * 04-06-2021
     * @param {Function} callback 
     */
    apiuserList: function (callback) {

        con.query("SELECT u.*,IFNULL(ut.device_token,'') as device_token,IFNULL(ut.device_type,'') as device_type,IFNULL(ut.token,'') as token FROM tbl_user u LEFT JOIN tbl_user_deviceinfo as ut ON u.id = ut.user_id ORDER BY u.id DESC", function (err, result, fields) {
            if (!err) {
                callback(result);
            } else {
                callback(null, err);
            }
        });
    },
}

module.exports = API;

// "SELECT u.*,IFNULL(ut.device_token,'') as device_token,IFNULL(ut.device_type,'') as device_type,IFNULL(ut.token,'') as token FROM tbl_user u LEFT JOIN tbl_user_deviceinfo as ut ON u.id = ut.user_id "
