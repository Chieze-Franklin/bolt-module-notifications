var checksCtrlr = require("bolt-internal-checks");
var notificationsChecksCtrlr = require('../controllers/checks');

var express = require('express');

var apiNotificationsCtrlr = require('../controllers/api-notifications');

var router = express.Router();

//post card
router.post('/', checksCtrlr.getAppName, notificationsChecksCtrlr.forSuspendedApps, apiNotificationsCtrlr.post);

//TODO: delete (remove all notifs for an app, or notif with a given _id)

//TODO: /dismiss (removes a user name from "to")

//TODO: a post-back, sends a targeted event back to app
router.post('/postback', checksCtrlr.forSystemApp, apiNotificationsCtrlr.postPostBack);

//un-suspend notifications from specified app
router.delete('/suspend', checksCtrlr.forSystemApp, apiNotificationsCtrlr.postUnsuspend);

//suspend notifications from specified app
router.post('/suspend', checksCtrlr.forSystemApp, apiNotificationsCtrlr.postSuspend);

router.post('/hooks/bolt/app-uninstalled', apiNotificationsCtrlr.hookForBoltAppUninstalled);

module.exports = router;