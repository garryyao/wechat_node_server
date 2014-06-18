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

// authenticate signature
app.get('/', function(req, res) {
	console.log(typeof res);
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

    // add message to firebase
    var name = "John";
    var text = msg.content;
    messages.push({ name: name, text: text });

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

messages.on('child_added', function(snapshot) {
	var message = snapshot.val();
	var formatted_message = message.name + " says: " + message.text;
	console.log(formatted_message);

	// fetch access_token in order to 发送客服消息
	

	// if the token is valid
	// then use the token and go straight to pushing the chat
	// else
	// fetch the token now and then push the chat after (in a callback)

	if (!!ACCESS_TOKEN && ((new Date().getTime()) < ACCESS_TOKEN.expiration)) {
		console.log("Pushing message without getting new token");
		pushChat();
	} else {
		console.log("Pushing message and getting a new token");
		getToken();
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
				console.log(body);
				// if the message comes back ok i.e. "errmsg" is "ok", then change status to read for wechat users
			}
		}

		request(pushChatOptions, pushChatCallback);
	}

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

				console.log(ACCESS_TOKEN);

				// now push the chat to the user
				pushChat();
			}
		}
		request(accessTokenOptions, accessTokenCallback);
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
