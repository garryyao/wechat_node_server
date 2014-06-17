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
var WEIXIN_HAO = "gh_a5956fdd03e2";

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
        		content : WEIXIN_HAO,
        		funcFlag : 0
        	};
        	break;
    }

    weixin.sendMsg(resMsg);
});

// listen for new messages and send to wechat users
// check for change to messages in firebase, then push message to all users accordingly
/*
CURRENTLY COMMENTED OUT FOR TESTING

messages.on('child_added', function(snapshot) {
	var message = snapshot.val();
	var formatted_message = message.name + " says: " + message.text;
	var textMsg = {
		fromUserName : WEIXIN_HAO,
		toUserName : "owHEYt8FZJVTvs3rp_3ra9tc-wfI", // to be replaced by all users
		msgType : "text",
		content : formatted_message,
		funcFlag : 0
	};
	weixin.sendMsg(textMsg);
});
*/


// Start
app.post('/', function(req, res) {
    weixin.loop(req, res);
});

var port = Number(process.env.PORT || 5000);
app.listen(port, function() {
  console.log("Listening on " + port);
});