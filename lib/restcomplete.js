//
// Node Modules
//
var fs	=	require('fs'),
path	=	require('path'),
restify	=	require('restify'),
noodles	=	require('noodles');
//
// Required Variables
//
var servicesFolder = process.argv[2],
reServiceFile =	/.+\.svc\.js$/,
serviceFiles = [],
services = [],
docs = {},
docNav = {},
servers = {},
configPath,config,docsURI;
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
		serviceFiles.push(path.join(servicesFolder,a));
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
	    }
	    else{
		docsURI = false;
	    }
	    setUpServer(config.serverConfig.port);
	    //
	    // Set up all the services
	    //
	    serviceFiles.forEach(function(p){
		setUpService(p);
	    });
	    //
	    // Build Docs if they are available
	    //
	    if(typeof config.serverOptions.docsURIBase !== "undefined"){
		buildDocs();
		docServiceInit();
	    }
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
  name: setUpServer
  description: Sets up server on a port
  @param{number} - port
*/
function setUpServer (port){
    if(typeof servers[port] === 'undefined') {
	var s = restify.createServer({
	    formatters: {
		"text/html": function(req, res, body){
		    return body;
		},
		'text/javascript':function(req, res, body){
		    return body;
		},
		'text/css':function(req, res, body){
		    return body;
		}
	    }
	});
	servers[port] = s;
	if(config.restifyOptions)
	    config.restifyOptions(restify, s);
	s.listen(port, config.serverConfig.ipOrDomain, (function(){
	    var listener  = typeof config.onServerListen !== "undefined" ? config.onServerListen.bind(undefined, s) : function(){};
	    return listener;
	}()));
    }
};
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
	console.log('The service `',service.name,'` has no attached services. It was, however, run.\n');
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
	console.log('The service `',service.name,'` has no attached services. It was, however, run.\n');
    }
};
/*--module--
  name:finalizeService
  description: restify each individual service.
*/
function finalizeService(service,subservice,root){
    var port, method;
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
    port = config.serverConfig.port;
    if(typeof servers[port][method] === "undefined"){
	console.log('The subservice `',subservice.name,'` in the service `',service.name,'` has an invalid http `method`. It will not launch.\n');
	return;
    }
    console.log(subservice.name, ' was set up at ',root + subservice.uri,' on port ', port, '\n');
    servers[port][method](root + subservice.uri, subservice.proxy.bind(undefined, servers[port]));
    if(typeof subservice.alternatePort === 'number'){
	port = subservice.alternatePort;
	setUpServer(port);
	console.log(subservice.name, ' was set up at ',root + subservice.uri,' on port ', port, '\n');
	servers[port][method](root + subservice.uri, subservice.proxy.bind(undefined, servers[port]));
    }
};
/*--module--
  name:buildDocs
  description: Grab files in Services folder reduce
  them to only service files, then require each
  of them and create a new file for each.
*/
function buildDocs(){
    new noodles.Template({
	rawString: fs.readFileSync(__dirname + '/index.html').toString(),
	metaData:'',
	onFinishCompiling:_buildDocs
    });
    var reResource = /\.(css|js)$/i
    fs.readdirSync(__dirname).filter(RegExp.prototype.test.bind(reResource)).forEach(function(el,index){
	var ext = el.split('.');
	ext = ext[ext.length - 1].toLowerCase();
	switch(ext){
	case 'js':
	    ext = 'text/javascript';
	    break;
	default:
	    ext = 'text/' + ext
	}
	docs.documents[el] = {
	    uri : el,
	    friendlyName : el,
	    doc : fs.readFileSync(__dirname + '/' + el),
	    contentType: ext
	};
    });
};
/*--module--
  name:_buildDocs
  description: Grab files in Services folder reduce
  them to only service files, then require each
  of them and create a new file for each.
*/
function _buildDocs(template){
    var docConfig = config.documentationConfig;
    docs.documents = {};
    var context = {
	mainNav:{},
	title:docConfig.title
    };
    serviceFiles.forEach(function(a,index){
	var service = require(a);
	context.mainNav[service.docPage] = {
	    uri:config.serverOptions.docsURIBase + '/' + service.docPage,
	    name:service.name
	};
    });
    serviceFiles.forEach(function(a,index){
	var service = require(a),
	article = '',
	services = service.services,
	subNav = {};
	if(typeof service.docPage === "undefined") return;
	if(typeof service.intro === 'string'){
	    article += '<h2>Introduction</h2>';
	    article += '<p>' + service.intro + '</p>';
	}
	Object.keys(services).forEach(function(el){
	    var sv = services[el],
	    id = sv.name.replace(/\s+/,'_').toLowerCase() + '-svc';
	    subNav[sv.name] = id;
	    article += '<h2 id="'+id+'">' + sv.name + '</h2> \n\n\t\n\t';
	    article += '<pre>method: `' + sv.method + '`\n\t';
	    article += 'uri rule: `' + sv.uri + '`\n\t';
	    article += 'description: ' + sv.description + '\n\t';
	    article += 'returns: \n\t\tformat: ' + sv.returns.format + '\n\t\tsignature: ' + sv.returns.signature.split(/\n+/g).join('\n\t\t') + '</pre>\n\t\n<p>'; 
	    article += sv.notes + '</p>\n\n\t\n\t';
	    if(typeof sv.example.request === "string"){
		article += '<pre>request: ' + sv.example.request + '\n\t';
	    }
	    else{
		article += '<pre>request:\n\t\turl: ' + sv.example.request.url + '\n\t\tdata: ' + sv.example.request.data + '\n\t';
	    }
	    article += 'response: ' + sv.example.response.split(/\n+/g).join('\n\t') + '</pre>\n\t\n\n';
	});
	if(index === 0){
	    docs.indexPage = service.docPage.toLowerCase();
	}
	var noodlesObj = {
	    mainnav:context.mainNav,
	    title:context.title,
	    article:article,
	    copyrightholder: docConfig.copyrightHolder || '',
	    copyrightwebsite : docConfig.copyrightWebSite || ''
	};
	if(Object.keys(subNav).length > 1)
	    noodlesObj.subnav = subNav;
	template.execute(noodlesObj,{
	    onRenderAll:function(docPage,name,string,context){
		var fname = context._others['title'].toLowerCase();
		docs.documents[service.docPage] = {
		    uri : docPage,
		    friendlyName : name,
		    doc : new Buffer(string),
		    contentType:'text/html'
		};
	    }.bind(undefined,service.docPage,service.name)
	},true);
	
    });
}
/*--module--
  name:docServiceInit
  description:
*/
function docServiceInit(){
    var uri =  config.serverOptions.docsURIBase + '/:docpage';
    console.log('Documentation service set up at: ',uri,'\n');
    servers[config.serverConfig.port]['get'](uri,docProxy);
    servers[config.serverConfig.port]['get'](config.serverOptions.docsURIBase,docProxy);
}
/*--module--
  name:docProxy
  description:
*/
function docProxy(req,res,next){
    if(typeof req.params.docpage === "undefined" || req.params.docpage.lenght == 0){
	res.header('Location',config.serverOptions.docsURIBase + '/' + docs.indexPage);
	res.send(302,'');
    }
    else if(typeof docs.documents[req.params.docpage.toLowerCase()] !== "undefined"){
	var docObj = docs.documents[req.params.docpage.toLowerCase()];
	res.header('Content-Type',docObj.contentType);
	res.send(docObj.doc);
    }
    else{
	return false;
    }
    return next()
};
