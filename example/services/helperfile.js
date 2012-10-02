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
