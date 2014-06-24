// app declarations
var express = require("express");
var weixin = require("weixin-api");
var connect = require("connect");
var request = require("request");
var app = express();
app.use(connect.json());
app.use(connect.urlencoded());

// wechat config
var config = require("./config"); // replace with your own variables or create your own config.js file
weixin.token = config.weixin_token;
var WEIXIN_HAO = config.weixin_hao;
var APP_ID = config.app_id;
var APP_SECRET = config.app_secret;
var ACCESS_TOKEN;

// firebase declarations
var Firebase = require('firebase');
var fireRoute = new Firebase(config.firebase_url);
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

	function accessTokenCallback (error, response, body) {
		if (!error && response.statusCode == 200) {
			var data = JSON.parse(body);
			ACCESS_TOKEN = new Object();
			ACCESS_TOKEN.access_token = data.access_token;
			ACCESS_TOKEN.expiration = (new Date().getTime()) + (data.expires_in - 10) * 1000;
			console.log("New access token retrieved: " + ACCESS_TOKEN.access_token);
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

// handle wechat subscription event
weixin.eventMsg(function(msg) {
	console.log("eventMsg received");

	var currentUserRef = users.child(msg.fromUserName);
	var resMsg = {};

	switch (msg.event) {
		case "subscribe" :
			currentUserRef.set({status: "no name"});
			resMsg = {
				fromUserName : msg.toUserName,
				toUserName : msg.fromUserName,
				msgType : "text",
				content : "Welcome to the demo! Before we begin, what's your name? (Note: please reply with your first name only)",
				funcFlag : 0
			};
			break;

		case "unsubscribe" :
			currentUserRef.remove();
			break;
	}

	weixin.sendMsg(resMsg);
});

// handle receive wechat text message event
weixin.textMsg(function(msg) {
    console.log("textMsg received");
    console.log(JSON.stringify(msg));

    var currentUserRef = users.child(msg.fromUserName);
    var resMsg = {};

    // verify the user, then proceed accordingly based on db
    currentUserRef.once('value', function(snapshot) {
		var userData = snapshot.val();
		if (userData.status === "no name") {
			currentUserRef.update({name: msg.content, status: "confirming"});
			var reply = "Your name is " + msg.content + ". Is that correct? (Note: please reply 'Yes' or 'No')";
			resMsg = {
                fromUserName : msg.toUserName,
                toUserName : msg.fromUserName,
                msgType : "text",
                content : reply,
                funcFlag : 0
            };
            weixin.sendMsg(resMsg);
		} else if (userData.status == "confirming") {
			switch (msg.content.toLowerCase()) {
				case "yes" :
					currentUserRef.update({status: "confirmed"});
					resMsg = {
		                fromUserName : msg.toUserName,
		                toUserName : msg.fromUserName,
		                msgType : "text",
		                content : "Great! I'll join you in with the chat now.",
		                funcFlag : 0
		            };
					break;

				case "no" :
					currentUserRef.update({status: "no name"});
					resMsg = {
		                fromUserName : msg.toUserName,
		                toUserName : msg.fromUserName,
		                msgType : "text",
		                content : "I'm sorry! Let's try again. What is your first name?",
		                funcFlag : 0
		            };
					break;

				default:
					var reply = "I'm sorry I didn't catch that. Just to confirm, is your name " + userData.name + "? (Note: please reply 'Yes' or 'No')";
					resMsg = {
		                fromUserName : msg.toUserName,
		                toUserName : msg.fromUserName,
		                msgType : "text",
		                content : reply,
		                funcFlag : 0
		            };
		            break;
			}
			weixin.sendMsg(resMsg);
		} else if (userData.status === "confirmed") {
		    var name = userData.name;
		    var text = msg.content;
		    messages.child(msg.msgId).once('value', function(msgSnapshot) { 
		    	if (!msgSnapshot.hasChild('wechat')) {
		    		messages.child(msg.msgId).set({ name: name, text: text, wechat: msg.fromUserName });
		    	}
		    });
		} else {
			resMsg = {
				fromUserName : msg.toUserName,
                toUserName : msg.fromUserName,
                msgType : "text",
                content : "",
                funcFlag : 0
			};
			weixin.sendMsg(resMsg);
		}
	});
});

// handle new firebase message event
messages.on('child_added', function(snapshot) {
	var message = snapshot.val();
	var msgRef = snapshot.ref();
	var formatted_message = message.name + " says: " + message.text;
	
	// go through all the users and see if it needs to be sent
	users.once('value', function(usersSnapshot) {
		usersSnapshot.forEach(function(userSnapshot) {
			var user = userSnapshot.val();
			var wechatId = userSnapshot.name();
			var read_by_user = "read_by_" + wechatId;
			if (!message[read_by_user] && (wechatId != message.wechat)) {
				console.log("Delivering the message to " + user.name);
				// if access token is undefined, wait 2 seconds
				if (!ACCESS_TOKEN) {
					setTimeout(function() {
						pushChat(wechatId);
					}, 3000);
				} else {
					pushChat(wechatId);
				}
			}
		});
	});	

	function pushChat(wechatId) {
		var pushChatURL = "https://api.wechat.com/cgi-bin/message/custom/send?access_token="+ACCESS_TOKEN.access_token;
		var pushChatOptions = {
			method: "POST",
			url: pushChatURL,
			body: JSON.stringify({
				"touser" : wechatId,
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
					console.log("Message successfully delivered--" + formatted_message);
					msgRef.child("read_by_"+wechatId).set(true, function() {
						console.log("...and marked as read by " + wechatId);
					}); // this doesn't work until restarting server ***
				} else {
					console.log("There was an error delivering the message: " + formatted_message);
				}
			}
		}

		request(pushChatOptions, pushChatCallback);
	}
});


// initiate response to wechat post request (text, img, event etc)
app.post('/', function(req, res) {
    weixin.loop(req, res);
});

// start the server
var port = Number(process.env.PORT || 5000);
app.listen(port, function() {
  console.log("Listening on " + port);
});
