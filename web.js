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

	/*
	var pushMsg = {};
	pushMsg = {
		fromUserName : WEIXIN_HAO,
		toUserName : "owHEYt8FZJVTvs3rp_3ra9tc-wfI",
		msgType : "text",
		content : formatted_message,
		funcFlag : 0
	};
	console.log(pushMsg);
	*/

	// fetch access_token in order to 发送客服消息
	var accessTokenURL = "https://api.wechat.com/cgi-bin/token?grant_type=client_credential&appid="+APP_ID+"&secret="+APP_SECRET;
	var accessTokenOptions = {
		method: "GET",
		url: accessTokenURL,
	};

	function accessTokenCallback (error, response, body) {
		if (!error && response.statusCode == 200) {
			var access_token = JSON.parse(body).access_token;
			console.log(access_token);

			// now push the chat to the user
			var pushChatURL = "https://api.wechat.com/cgi-bin/message/custom/send?access_token="+access_token;
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
					console.log("The message " + formatted_message + " was successfully delivered.");
					console.log(body);
				}
			}

			request(pushChatOptions, pushChatCallback);
		}
	}

	request(accessTokenOptions, accessTokenCallback);


});




// Start
app.post('/', function(req, res) {
    weixin.loop(req, res);
});

var port = Number(process.env.PORT || 5000);
app.listen(port, function() {
  console.log("Listening on " + port);
});
