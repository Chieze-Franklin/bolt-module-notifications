var checksCtrlr = require("bolt-internal-checks");
var notificationsChecksCtrlr = require('../controllers/checks');

var express = require('express');

var apiNotificationsCtrlr = require('../controllers/api-notifications');

var router = express.Router();

//post card
router.post('/', checksCtrlr.getAppName, notificationsChecksCtrlr.forSuspendedApps, apiNotificationsCtrlr.post);

//un-suspend notifications from specified app
router.delete('/suspend', checksCtrlr.forSystemApp, apiNotificationsCtrlr.postUnsuspend);

//suspend notifications from specified app
router.post('/suspend', checksCtrlr.forSystemApp, apiNotificationsCtrlr.postSuspend);

module.exports = router;