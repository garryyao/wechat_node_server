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

var port = Number(process.env.PORT || 5000);
app.listen(port, function() {
  console.log("Listening on " + port);
});