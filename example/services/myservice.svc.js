//
// Node Modules
//
var helpService	=	require('./helperfile.js'),
	config 		= require('./config.js');

var service = module.exports = {
	name: 'Service 1 API',
	root:'', //this could be a further path parameter 
	version: '0.0.1',
	docPage:'service1',
        intro: 'This is a service that does foo.',
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
