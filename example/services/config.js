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