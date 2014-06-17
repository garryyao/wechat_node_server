// declarations
var express = require("express");
var weixin = require("weixin-api");
var connect = require("connect");
var Firebase = require('firebase');
var myRootRef = new Firebase('https://ef-play-demo.firebaseIO.com/');
var app = express();

app.use(connect.json());
app.use(connect.urlencoded());
app.use(connect.multipart());

// config
weixin.token = "efef";

// access verification
app.get('/', function(req, res) {
    // check signature
    if (weixin.checkSignature(req)) {
        res.send(200, req.query.echostr);
    } else {
        res.send(200, 'hello EF!');
    }
});

weixin.textMsg(function(msg) {
    console.log("textMsg received");
    console.log(JSON.stringify(msg));

    var resMsg = {};

    switch (msg.content) {
        case "hello" :
            resMsg = {
                fromUserName : msg.toUserName,
                toUserName : msg.fromUserName,
                msgType : "text",
                content : "hi back",
                funcFlag : 0
            };
            break;

        case "my name" :
        	resMsg = {
        		fromUserName : msg.toUserName,
        		toUserName : msg.fromUserName,
        		msgType : "text",
        		content : msg.fromUserName,
        		funcFlag : 0
        	};
        	break;
    }

    weixin.sendMsg(resMsg);
});

// Start
app.post('/', function(req, res) {
    // loop
    weixin.loop(req, res);
});

var port = Number(process.env.PORT || 5000);
app.listen(port, function() {
  console.log("Listening on " + port);
});