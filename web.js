var express = require("express");
var sha1 = require('sha1');
var app = express();

app.get('/', function(req, res) {
  res.send('Hello, EF!');

  // wechat verification
  signature = req.params.signature;
  timestamp = req.params.timestamp;
  nonce = req.params.nonce;
  echostr = req.params.echostr;
  TOKEN = "efef";

  tmpArr = [TOKEN, timestamp, nonce];
  tmpStr = sha1(tmpArr.sort().join());

  if (signature === tmpStr) {
  	res.writeHead(200);
  	res.write(echostr);
  	res.end();
  }

});

var port = Number(process.env.PORT || 5000);
app.listen(port, function() {
  console.log("Listening on " + port);
});