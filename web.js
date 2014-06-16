var http = require("http");
var Firebase = require('firebase');
var myRootRef = new Firebase('https://ef-play-demo.firebaseio.com/');

http.createServer(function(request, response) {
	response.writeHead(200);
	response.write("Hello, EF!");
	response.end();
}).listen(3000);