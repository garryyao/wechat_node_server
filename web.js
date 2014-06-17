// app declarations
var express = require("express");
var weixin = require("weixin-api");
var connect = require("connect");
var app = express();
app.use(connect.json());
app.use(connect.urlencoded());
app.use(connect.multipart());

// wechat config
weixin.token = "efef";
var APP_ID = "wx4ee5ca70e09083cb";
var APP_SECRET = "c6c24defe7cd98877a81a1b0cf67969d";

// firebase declarations
var Firebase = require('firebase');
var firebase_url = 'https://ef-play-demo.firebaseio.com/';
var fireRoute = new Firebase(firebase_url);
var messages = fireRoute.child('messages');
var users = fireRoute.child('users');

// authenticate signature
app.get('/', function(req, res) {
    if (weixin.checkSignature(req)) {
        res.send(200, req.query.echostr);
    } else {
        res.send(200, 'hello EF!');
    }
});

// receive text message event
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

        case "get app id" :
        	resMsg = {
        		fromUserName : msg.toUserName,
        		toUserName : msg.fromUserName,
        		msgType : "text",
        		content : msg.toUserName,
        		funcFlag : 0
        	};
        	break;
    }

    weixin.sendMsg(resMsg);
});

// listen for new messages and send to wechat users


// Start
app.post('/', function(req, res) {
    weixin.loop(req, res);
});

var port = Number(process.env.PORT || 5000);
app.listen(port, function() {
  console.log("Listening on " + port);
});