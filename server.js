//Requred modules

var app = require('http').createServer(handler)
var io = require('socket.io')(app);
var fs = require('fs');
var url = require('url');

//Settings file

var settings = require('./settings.js');

//Listen to port in settings file

app.listen(settings.port);

//HTTP request handling

function handler (req, res) {
    
//Ignore favicon
    
    if(req.url !== "favicon.ico"){

//Home page
    
    if(req.url === "/"){
     
    req.url = "/index.html";
        
    }
        
//Check if file exists, if so, load it. If not use routing. 
    
fs.exists(__dirname + req.url, function(exists) {
  if (!exists) {
      
    //Redirect to home
      
    req.url = "/index.html";
      
  } 
    
    fs.readFile(__dirname + req.url,
  function (err, data) {
    if (err) {
    
    //File didn't load but exists!?
        
    res.end("something went wrong");
        
    }else{
        
//Get extension of app files and send relevant file type 

var extension = req.url.split(".")[1];

var type = "text";
      
switch(extension){
 
    case "js":
        type = "application/javascript";
        break;
    case "html":
        type = "text/html";
        break;
    case "css":
        type = "text/css";
        break
}
        
//Send file
    
res.writeHead(200, {'Content-Type': type,'Content-Length':data.length});
        res.write(data);
        res.end();
    }
  });
        

});
        
    }
}

//Web Sockets!

io.on('connection', function (socket) {

//Send hello event when client connects

socket.emit('hello',"hello");

//When user fetches squarefield, parse the url they send and send the relevant squarefield data
    
socket.on('fetch', function (data) {

socket.emit('load', url.parse(data).pathname)
      
  });
    
});