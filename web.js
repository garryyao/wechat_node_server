// declarations
var express = require("express");
var weixin = require("weixin-api");
var app = express();

// config
weixin.token = "efef";

// access verification
app.get('/', function(req, res) {
    // check signature
    if (weixin.checkSignature(req)) {
        res.send(200, req.query.echostr);
    } else {
        res.send(200, 'fail');
    }
});

weixin.textMsg(function(msg) {
    console.log("textMsg received");
    console.log(JSON.stringify(msg));

    var resMsg = {};

    switch (msg.content) {
        case "文本" :
            // 返回文本消息
            resMsg = {
                fromUserName : msg.toUserName,
                toUserName : msg.fromUserName,
                msgType : "text",
                content : "这是文本回复",
                funcFlag : 0
            };
            break;
    }

    weixin.sendMsg(resMsg);
}

var port = Number(process.env.PORT || 5000);
app.listen(port, function() {
  console.log("Listening on " + port);
});