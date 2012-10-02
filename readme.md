RestComplete
------------
Installation
============
In order to install you have to use npm as there is too much building that needs to take place to make it a "gitable" repo.
	
	npm install restcomplete
	

Introduction
============
RestComplete is really just a bunch of sugar. The bulk of the work is done by [Restify](https://github.com/mcavage/node-restify) and [Noodles](https://github.com/nathanjsweet/Noodles). What RestComplete does is provide a simple set of protocols that a user can create that will automatically both prop up the service and document the request and response schematics of the service. How this is accomplished is by passing a folder path that contains the services that need to be propped RestComplete either a command line argument or invoking it's "Init" method and passing that method the same folder path:
	
	node node_modules/restcomplete/lib/restcomplete.js ./services
	
The preferred way is to construct a script that does this work (it makes it easier to utilize services like [Forever](https://github.com/nodejitsu/forever) this way):
	
	var path = require('path');
	require('restcomplete').Init(path.join(__dirname,'services'));
	
If this is confusing so far, don't worry, it should be; RestComplete, as a whole, does a lot. The best way to learn how to use it is to look at the example folder. However some documentation is outlined here.

Documentation
=============
Here is an example of what a directory that utilizes RestComplete probably looks like.
	
	|-index.js
	|_node_modules
		|
		|_restcomplete
			|-....
	|_services
		|-config.js
		|-myservice.svc.js
		|-helperfile.js
	
"index.js" is the script that simply calls RestComplete and gives it the "services" folder (see above) as a string argument. What RestComplete then does is look at every file in the services folder and specifically looks for "config.js" and any file that ends with the postfix ".svc.js". These ".svc.js" files are the only files that RestComplete actually processes, though as we will see, they can require any necessary JavaScript files around them or require other node modules like any other node script file can do. Let's start with what the "config.js" file looks like. It controls a lot of the basic functionality of RestComplete:
	
	exports.serverConfig = {
		port		:	8080,
		ipOrDomain	:	'myservice'
	};
	exports.serverOptions = {
		name		:	'My Web Services',
		version		:	'0.0.1',
		docsURIBase	:	'/docs'
	};
	//
	// If you are building out documentation
	// use this to provide information
	// to the documentor function.
	//
	exports.documentationConfig = {
		copyrightHolder		:	'My Company Inc.',
		copyrightWebSite	:	'http://www.mysite.com',
		title				:	'My Company\'s Web Services'
	};

	exports.onServerListen = function(server){
		console.log('%s listening at %s', server.name, server.url);
	}

	exports.restifyOptions = function(restify,server){
		server.use(restify.acceptParser(server.acceptable));
		server.use(restify.queryParser());
		server.use(restify.bodyParser());
	}
	
As you can see the "config.js" is pretty simple it simply outlines what port and ip/domain RestComplete will listen to in order to provide the services you will outline later. IT also has some ancillary information that will be used to build out the documentation of your services. You will also notice that the ability to "tweek" restify is exposed; it's probably best not to mess with these options unless you know what you are doing, but you can certainly look at restify's [documentation](http://mcavage.github.com/node-restify/) to do so. Some of this configuration information is not required for RestComplete to work, but if you aren't interested in the documentation capability of RestComplete you might as well just use restify directly. Next we will look at what a service (".svc.js") file looks like:
	
	//
	// Node Modules
	//
	var helpService	=	require('helperfile'),
		config 		= require('./config');

	var service = module.exports = {
		name: 'Service 1 API',
		root:'', //this could be a further path parameter 
		version: '0.0.1',
		docPage:'service1',
		services:{}
	};

	service.services.subserviceget = {
		method:'GET',//necesarry for launch and docs
		name:'Service 1\'s GET sub service',//not necessary, the key will be used if this is not present.
		uri:'/subsvc1/:param1',//necessary for launch
		description:'A generic service for Service 1',
		notes:'This is where your explantory notes for this service will go. It can be as long as you want.',
		example:{
			request:'http://' + config.serverConfig.ipOrDomain + '/subsvc1/foo?term=bar',
			response:'{\
				\n\t"response":"foobar",\
			\n}'
		},
		version:'0.0.1',
		returns:{
			format:'application/json',
			signature:'{\
			\n\t"response":"/*+/",\
			\n}'
		},
		proxy:helpService.service1.subServiceGet
	};
	
That's a lot to take in, I know, but it's actually pretty simple. Every single service passed to RestComplete is simply an object that has a name, a base documentation URI ("service1" in the example above), and a "services" object that contains "sub-service" object(s) that actually outline the functionality of the service (what method is used, the URI, what parameters will be derived from the URI, and the function that will handle all incoming requests for that service). As you would expect "method" can be any http method ("PUT","DELETE","POST",etc), which means that a service which defines it's http method as such will only respond to that http method even if the URI matches. The "uri" parameter of the sub-service object can, in turn, be a string (as seen above), but it can also be a Regular Expression (see restify for details). Finally the "proxy" field is the function that will accept every request for the particular sub-service. All other sub-service fields are used by the documentation engine and aren't actually part of the functionality of the service. So in theory the above object would work exactly the same way if it was presented like this:
	
	//
	// Node Modules
	//
	var helpService	=	require('./helperfile'),
		config 		= require('./config');

	var service = module.exports = {
		services:{}
	};

	service.services.subserviceget = {
		method:'GET',//necesarry for launch and docs
		uri:'/subsvc1/:param1',//necessary for launch
		proxy:helpService.service1.subServiceGet
	};
	
Finally we are going to look at the "helperfile" that seems to define this function that is "proxying" the request:
	
	//Given a request of http://myservice/subsvc1/foo?term=bar
	exports.service1 = {
		subServiceGet: function(request,response,next){
			var param1 = request.params["param1"],
				term = request.params["term"];
			res.send({
				"response":param1 +","+ term;
			});
			return next();
		}
	};
	//The response will look like:
	/*{
		"response":"foo,bar"
	}*/
	
Obviously this function can be used to handle more complicated logic or to call upon a nodeJS module or some other set of services. This example is simply here to illustrate how a response would work. For a complete understanding of how this response functionality works simply look at the (restify documentation)[http://mcavage.github.com/node-restify/], it will explain how to service a request with different types of responses (such as redirecting or 404 responses).