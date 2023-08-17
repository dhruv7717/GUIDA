var express         = require('express');
var cron_model      = require('./cron_model');
var common          = require('../../../config/common');
var globals         = require('../../../config/constant');
var datetime        = require('node-datetime');
var cron            = require('cron');
var moment          = require('moment');
var router          = express.Router();
const { t }         = require('localizify');

/*
** Cron for expiry stories after 24 hours
*/
var cronevent_rotation = new cron.CronJob({
    cronTime: '* * * * * *',
    onTick: function () {
        var currenttime = datetime.create().format('Y-m-d H:M:S');
        cron_model.guide_settlement(currenttime,function(settlement){
            // if (settlement != null) {
            //     console.log('driver assigned',settlement);
            // } else {
            //     console.log('No data');
            // }
        });
    },
    start: true,
    timeZone: 'UTC'
});

module.exports = router;