var config = require("bolt-internal-config");
var errors = require("bolt-internal-errors");
var models = require("bolt-internal-models");
var utils = require("bolt-internal-utils");

var fs = require('fs');
var path = require("path");
var mongodb = require('mongodb');
var superagent = require('superagent');

const X_BOLT_APP_TOKEN = 'X-Bolt-App-Token';

/*
**Impersonating Bolt**
bolt-module-dashboard registers various collections
bolt-module-dashboard also lists Bolt (bolt) as a tenant to each of its collection
	meaning bolt has write (and read) access to its collections
when accessing any of those collections, we use bolt's app token (request.appName) instead of the app token for bolt-module-dashboard
we can use bolt's app token because bolt-module-dashboard installs (hopefully) as a system app
we have to use bolt's app token because bolt-module-dashboard can't have an app token of its own since it is a module (see its package.json)

*** schema of a notification ***
{
	app: String //the name of the app that owns this notification (request.appName)
	buttons: [
	{
		type: String //values: link | postback | phone
		text: String //text to appear on button
		data: String //the url | post payload | phone number
	}
	]
	from: String //username of sender
	message: {
		type: String //values: text | audio | file | image | video | page
		data: String
	}
	options: {
		sticky: Boolean //(default false) if true, notification does not close when clicked
		transient: Boolean //(default false) if true, notification is not saved to the DB
	}
	query: String
	route: String
	sound: {
		location: String //the path to a sound file (probably on the file system or a URL)
		loop: Boolean //(default false) if true, plays the sound in a loop
		duration: Number //duration (in milliseconds) for which the loop is to last (there may be a system-defined max value)
	}
	to: [String] //array of usernames of recipients
	toast: {
		message: String
		duration: Number //duration (in milliseconds) for which the toast is to last (there may be a system-defined max value)
	}
	type: success | info | warning | error
}
*/

module.exports = {
	post: function(request, response){
		if (utils.Misc.isNullOrUndefined(request.body.message)) {
			var error = new Error(errors['520']);
			response.end(utils.Misc.createResponse(null, error, 520));
			return;
		}

		var notification = request.body;
		notification.app = request.appName;

		var message = request.body.message;
		if (message.constructor === String) {
			notification.message = {
				type: 'text',
				data: message
			};
		}

		superagent
			.post(process.env.BOLT_ADDRESS + '/api/db/notifications/insert')
			.set(X_BOLT_APP_TOKEN, request.bolt.token) //see **Impersonating Bolt** above to understand this line
			.send({ app: 'bolt-module-notifications', object: notification })
			.end(function(err, res) {
				if (!utils.Misc.isNullOrUndefined(res)) {
					if (res.body && res.body.body && res.body.body.insertedIds) {
						notification._id = res.body.body.insertedIds[0];
						notification.id = res.body.body.insertedIds[0];
					}
				}
					
				utils.Events.fire('notification-posted', { body: notification }, request.bolt.token, function(eventError, eventResponse){});
				response.send(utils.Misc.createResponse(notification, err));
			});
	},
	postUnsuspend: function(request, response){
		var appsToResume = request.body.apps || [];

		if (appsToResume.length > 0) {
			superagent
				.post(process.env.BOLT_ADDRESS + '/api/db/app-categories/findone?category=suspended')
				.set(X_BOLT_APP_TOKEN, request.bolt.token) //impersonating Bolt
				.send({ app: 'bolt-module-notifications' })
				.end(function(err, category) {
					category = category || {
						category: 'suspended'
					};
					var apps = category.apps || [];

					var indicesToRemove = [];
					indicesToRemove = apps.map(function(app, index){
						if (appsToResume.indexOf(app) > -1) {
							return index;
						}
					});

					category.apps = apps.filter(function(app, index){
		              return indicesToRemove.indexOf(index) == -1;
		            });

				    superagent
						.post(process.env.BOLT_ADDRESS + '/api/db/app-categories/replace?category=suspended')
						.set(X_BOLT_APP_TOKEN, request.bolt.token) //impersonating Bolt
						.send({ app: 'bolt-module-notifications', values: category, upsert: true })
						.end(function(err, res) {
							response.send(utils.Misc.createResponse(res, err));
						});
				});
		}
		else {
			response.send();
		}
	},
	postSuspend: function(request, response){
		var appsToSuspend = request.body.apps || [];

		superagent
			.post(process.env.BOLT_ADDRESS + '/api/db/app-categories/findone?category=suspended')
			.set(X_BOLT_APP_TOKEN, request.bolt.token) //impersonating Bolt
			.send({ app: 'bolt-module-notifications' })
			.end(function(err, category) {
				category = category || {
					category: 'suspended'
				};
				var apps = category.apps || [];
				apps = apps.concat(appsToSuspend);

				var seen = {};
			    category.apps = apps.filter(function(app) {
			        return seen.hasOwnProperty(app) ? false : (seen[app] = true);
			    });

			    superagent
					.post(process.env.BOLT_ADDRESS + '/api/db/app-categories/replace?category=suspended')
					.set(X_BOLT_APP_TOKEN, request.bolt.token) //impersonating Bolt
					.send({ app: 'bolt-module-notifications', values: category, upsert: true })
					.end(function(err, res) {
						response.send(utils.Misc.createResponse(res, err));
					});
			});
	}
};
