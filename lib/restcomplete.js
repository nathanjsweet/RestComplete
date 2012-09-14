//
// Node Modules
//
var fs		=	require('fs'),
	path	=	require('path'),
	restify	=	require('restify');
//
// Required Variables
//
var servicesFolder	=	process.argv[2],
	reServiceFile	=	/.+\.svc\.js$/,
	serviceFiles	=	[],
	services		=	[],
	configPath,config,server,docsURI;
//
// Does the service folder exist?
// Otherwise we can't really do anything.
// Sync is used because it doesn't really matter for spinning up purposes.
//
if(typeof servicesFolder !== "undefined" && fs.existsSync(servicesFolder) && fs.statSync(servicesFolder).isDirectory()){
	Init(servicesFolder);
}
exports.Init = Init;
//
// Are there even any services?
// Set them up if there are.
//
function Init(sF){
	servicesFolder = sF;
	configPath = path.join(servicesFolder,'config.js');
	if(fs.existsSync(configPath) && fs.statSync(configPath).isFile()){
		fs.readdirSync(servicesFolder).forEach(function(a){
			if(reServiceFile.test(a))
				serviceFiles.push(a);
		});
	}
	else{
		throw "config.js for the services folder `" + servicesFolder + "` does not exist";
	}
	if(serviceFiles.length > 0){
		//
		// Grab config file
		// Set up restify server
		//
		config = require(configPath);
		if(typeof config.serverConfig.port !== "undefined" && config.serverConfig.ipOrDomain !== "undefined"){
			//
			// If docs uri is specified grab it.
			//
			if(config.serverOptions.docsURIBase !== "undefined"){
				docsURI = config.serverOptions.docsURIBase;
				delete config.serverOptions.docsURIBase;
			}
			else{
				docsURI = false;
			}
			server = restify.createServer(config.serverOptions);
			if(config.restifyOptions){
				config.restifyOptions(restify,server);
			}
			//
			// Set up all the services
			//
			serviceFiles.forEach(function(p){
				setUpService(path.join(servicesFolder,p));
			});
			//
			// Set up server
			//
			server.listen(config.serverConfig.port, config.serverConfig.ipOrDomain,(function(){
				var listener  = typeof config.onServerListen !== "undefined" ? config.onServerListen.bind(undefined,server) : function(){};
				return listener;
			}()));
		}
		else{
			throw "config.js in services folder `"+ servicesFolder + "` does not have sufficient serverConfig Parameters.";
		}

	}
	else{
		throw "There are now service files in the services folder `" + servicesFolder + "`.";
	}
}
/*--module--
name: setUpService
description: checks to make sure every service is viable,
	passes it through other gauntlets.
@param{string} - path
*/
function setUpService (p){
	var service;
	try{
		service = require(p);
		services.push(service);
	}
	catch(e){
		console.log("The service at `",p,"` was not set up because of an error:\n",e,"\n");
		return;
	}
	parseService(service,p);
};
/*--module--
name: parseService
description: sets up servie if it has all necessary data.
@param{object} - the service object
*/
function parseService(service,p){
	var keys,root
	if(typeof service.name !== "string"){
		console.log('The service at `',p,'` has no name. It will not be launched.\n');
		return
	}
	if(typeof service.version !== "string"){
		console.log('The service `',service.name,'` is unversioned. It will not be launched.\n');
		return;
	}
	if(typeof service.services !== "object"){
		console.log('The service `',service.name,'` has no attached services. It will, de facto, not be launched.\n');
		return;
	}
	keys = Object.keys(service.services);
	if(keys.length > 0){
		root = service.root || '';
		keys.forEach(function(a){
			var subservice = service.services[a];
			subservice.name = subservice.name || a;
			finalizeService(service,subservice,root);
		});
	}
	else{
		console.log('The service `',service.name,'` has no attached services. It will, de facto, not be launched.\n');
	}
};
/*--module--
name:finalizeService
description: restify each individual service.
*/
function finalizeService(service,subservice,root){
	var method;
	if(typeof subservice.method !== "string"){
		console.log('The subservice `',subservice.name,'` in the service `',service.name,'` has no specified http `method`. It will not launch.\n');
		return;
	}
	if(typeof subservice.uri !== "string"){
		console.log('The subservice `',subservice.name,'` in the service `',service.name,'` has no specified `uri`. It will not launch.\n');
		return;
	}
	if(typeof subservice.proxy !== "function"){
		console.log('The subservice `',subservice.name,'` in the service `',service.name,'` has no specified `proxy` function. It will not launch.\n');
		return;
	}
	method = subservice.method.toLowerCase();
	if(typeof server[method] === "undefined"){
		console.log('The subservice `',subservice.name,'` in the service `',service.name,'` has an invalid http `method`. It will not launch.\n');
		return;
	}
	console.log(subservice.name, ' was set up at ',root + subservice.uri,'\n');
	server[method](root + subservice.uri,subservice.proxy.bind(undefined,server));
};