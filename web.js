// app declarations
var express = require("express");
var weixin = require("weixin-api");
var connect = require("connect");
var http = require("http");
var request = require("request");
var app = express();
app.use(connect.json());
app.use(connect.urlencoded());

// wechat config
weixin.token = "efef";
var WEIXIN_HAO = "gh_a5956fdd03e2";
var APP_ID = "wx3bd6462d57a03618";
var APP_SECRET = "f59d49264e430799579bd831a1927f0b";
var ACCESS_TOKEN;

// firebase declarations
var Firebase = require('firebase');
var firebase_url = 'https://ef-play-demo.firebaseio.com/';
var fireRoute = new Firebase(firebase_url);
var messages = fireRoute.child('messages');
var users = fireRoute.child('users');

// get a new access token every hour
getToken();
setInterval(getToken, 3600000);
function getToken() {
	var accessTokenURL = "https://api.wechat.com/cgi-bin/token?grant_type=client_credential&appid="+APP_ID+"&secret="+APP_SECRET;
	var accessTokenOptions = {
		method: "GET",
		url: accessTokenURL,
	};
	var ACCESS_TOKEN = undefined;

	function accessTokenCallback (error, response, body) {
		if (!error && response.statusCode == 200) {
			var data = JSON.parse(body);
			ACCESS_TOKEN = new Object();
			ACCESS_TOKEN.access_token = data.access_token;
			ACCESS_TOKEN.expiration = (new Date().getTime()) + (data.expires_in - 10) * 1000;
			console.log("New access token retrived: " + ACCESS_TOKEN.access_token);
		}
	}
	request(accessTokenOptions, accessTokenCallback);
}


// authenticate signature
app.get('/', function(req, res) {
	console.log(typeof res);
    if (weixin.checkSignature(req)) {
        res.send(200, req.query.echostr);
    } else {
        res.send(200, 'hello EF!');
    }
});

weixin.eventMsg(function(msg) {
	console.log("eventMsg received");

	var resMsg = {};
	switch (msg.event) {
		case "subscribe" :
			resMsg = {
				fromUserName : msg.toUserName,
				toUserName : msg.fromUserName,
				msgType : "text",
				content : "Welcome to EF Play! Before we begin, what's your name? (Note: Please reply with your first name only)",
				funcFlag : 0
			};
			break;

		case "unsubscribe" :
			resMsg = {
				fromUserName : msg.toUserName,
				toUserName : msg.fromUserName,
				msgType : "text",
				content : "Sorry to see you go! Goodbye.",
				funcFlag : 0
			};
			break;
	}

	weixin.sendMsg(resMsg);
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

        default:
        	console.log("Sorry, no default response for this query");
        	// add message to firebase
		    var name = "John";
		    var text = msg.content;
		    messages.child(msg.msgId).set({ name: name, text: text });
        	break;
    }

    weixin.sendMsg(resMsg);
});

// listen for new messages and send to wechat users
// check for change to messages in firebase, then push message to all users accordingly
messages.on('child_added', function(snapshot) {
	var message = snapshot.val();
	var msgRef = snapshot.ref();
	var formatted_message = message.name + " says: " + message.text;
	
	if (!message.read) {
		// if access token is undefined, wait 2 seconds
		if (!ACCESS_TOKEN) {
			setTimeout(function() {
				pushChat();
			}, 3000);
		} else {
			pushChat();
		}
	}

	function pushChat() {
		var pushChatURL = "https://api.wechat.com/cgi-bin/message/custom/send?access_token="+ACCESS_TOKEN.access_token;
		var pushChatOptions = {
			method: "POST",
			url: pushChatURL,
			body: JSON.stringify({
				"touser" : "owHEYt8FZJVTvs3rp_3ra9tc-wfI",
				"msgtype" : "text",
				"text" :
				{
					"content" : formatted_message
				}
			})
		};

		function pushChatCallback (error, response, body) {
			if (!error && response.statusCode == 200) {
				bodyObject = JSON.parse(body);
				if (bodyObject.errmsg === "ok") {
					console.log("Message successfully delivered: " + formatted_message);
					msgRef.update({read:true});
				} else {
					console.log("There was an error delivering the message: " + formatted_message);
				}
			}
		}

		request(pushChatOptions, pushChatCallback);
	}
});


// Start
app.post('/', function(req, res) {
    weixin.loop(req, res);
});

var port = Number(process.env.PORT || 5000);
app.listen(port, function() {
  console.log("Listening on " + port);
});
