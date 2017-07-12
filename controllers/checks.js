var errors = require("bolt-internal-errors");
var models = require("bolt-internal-models");
var utils = require("bolt-internal-utils");

var superagent = require('superagent');

const X_BOLT_APP_TOKEN = 'X-Bolt-App-Token';

module.exports = {
	//checks if the app making this request is suspended from doing so
	forSuspendedApps: function(request, response, next) {
		var appName = request.appName;

		superagent
			.post(process.env.BOLT_ADDRESS + '/api/db/app-categories/findone?category=suspended')
			.set(X_BOLT_APP_TOKEN, request.bolt.token) //impersonating Bolt
			.send({ app: 'bolt-module-notifications' })
			.end(function(err, category) {
				if (!utils.Misc.isNullOrUndefined(err)) {
					response.end(utils.Misc.createResponse(null, err));
				}
				else if (!utils.Misc.isNullOrUndefined(category)) {
					category.apps = category.apps || [];
					if (category.apps.map(function(value){ return value.toLowerCase(); }).indexOf(appName) > -1) {
						//app is suspended
						var error = new Error(errors['524']);
						response.end(utils.Misc.createResponse(null, error, 524));
					}
					else {
						next();
					}
				}
				else {
					next();
				}
			});
	}
};
