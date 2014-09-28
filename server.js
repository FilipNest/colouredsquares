//Settings file

var settings = require('./settings.secret');

//Connect to database and trigger ready event when done;

require('mongodb').MongoClient.connect(settings.mongo, function(err, db) {
    if(err) throw err;
    db_ready(db);
})

var db_ready = function(db){

//Required modules
    
var app = require('http').createServer(handler)
var io = require('socket.io')(app);
var fs = require('fs');
var url = require('url');
var format = require('util').format;
    
/*

SERVER ROUTING

*/
    
//Listen to port in settings file

app.listen(settings.port);

//HTTP request handling

function handler (req, res) {
    
//Ignore favicon
    
    if(req.url !== "favicon.ico"){

//Redirect document root to home page
    
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
        
    res.end("File didn't load but exists!?");
        
    }else{
        
//Get extension of app files and send relevant file type 

var extension = req.url.split(".")[1];

//Set default type

var type = "text";
        
//Change type depending on extention
      
switch(extension){
 
    case "png":
        type = "image/png";
        break;
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
        
//Send file, unless it's a secret like the settings file
  
if(extension !== "secret"){
res.writeHead(200, {'Content-Type': type,'Content-Length':data.length});
        res.write(data);
        res.end();
}else{
    
    // Access denied
    
    res.writeHead(403);
    res.end("Not like this.");
        
    }
    }
  });
        

});
        
    }
}
    
/*

Coloured Squares functions

*/

//Wrapper object
    
cs = {};

cs.users = db.collection('users');
cs.fields = db.collection('squarefields');

//Check if username exists
    
cs.userexists = function(name,callback){
    
cs.users.findOne({name:name}, function(err, document) {
    
if(document){

callback(true);

}else{
    
callback(false);

}
    
    });
}

//Check if email is in use

cs.emailexists = function(email,callback){
    
cs.users.findOne({email:email}, function(err, document) {
    
if(document){

callback(true);

}else{
    
callback(false);

}
    
    });
}

//Create user
    
cs.createUser = function(name,email,password){
    
cs.userexists(name,function(exists){
    
if(!exists){
    
cs.emailexists(email,function(exists){
    
if(!exists){

//Database check passed. Still need content validation.
    
cs.users.insert({name:name,password:password,email:email,friends:[],bookmarks:[]},function(err,document){
            
        console.log("User " + name + " created");
            
        });
    
}else{
              
            console.log("email already in use");
              
              }
});
              
              
              } else{

console.log("User already exists");
    
}
    
})
    
};
    
cs.updateUser = function(currentname,currentemail,name,password,email,friends,bookmarks){
  
cs.userexists(name,function(exists){
    
if(!exists || name === currentname){
    
cs.emailexists(email,function(exists){
    
if(!exists || email === currentemail){
cs.users.update({name:currentname},{name:name,email:email,password:password,friends:friends,bookmarks:bookmarks},function(err,document){
    
console.log("updated");
    
})
}else {
    
    console.log("email in use");
    
}});
                 }else{
                     
                  console.log("Name already in use");
                     
                 }
})
};

//Test functions
    
//cs.createUser("Test","test@bluejumpers.com","rgbw");
cs.updateUser("Filip","test@bluejumpers.com","Filip","rgbw","filip@bluejumpers.com",["hello"],["world"]);

    
//Function for creating squarefield matrix and settings

var create = function(email,password,name,description){
    
if(!name){
 name = email.split("@")[0].replace(".","");   
}
    
if(!description){
 description = null;   
}
    
var i,squares = [];
for(i=1; i<= 256; i+=1){
 
squares.push({number:i,colour:"transparent",image:null,access:{public:2,friends:2}});
    
}
    
return {name:name, description:description, email:email, friends:[], following:[],squares:squares,updated:null};
    
};

//Create squarefields collection and home squarefield if they don't already exist

    var collection = db.collection('squarefields');

    collection.findOne({name:"home"}, function(err, document) {

        if(!document){
         
        collection.insert(create("filip@bluejumpers.com","rgbw","home","The home squarefield"),function(err,document){
            
        console.log("inserted");
            
        });
            
        }
          
      });

//Web Sockets!

io.on('connection', function (socket) {

//Send hello event when client connects

socket.emit('hello',"hello");

//When user fetches squarefield, parse the url they send and send the relevant squarefield data
    
socket.on('fetch', function (data) {
    
var squarefield = url.parse(data).pathname.replace("/","");

    //Load home if no squarefield
      
    if(!squarefield){
        
    squarefield = "home";
        
    }
      
    var collection = db.collection('squarefields');

    collection.findOne({name: squarefield}, function(err, document) {     
          
    socket.emit("load",document);   
          
      });
         
});
    
//Change squarefield in database when clicked
    
socket.on("squarechange",function(data){
      
    var collection = db.collection('squarefields');
      
      var square = parseInt(data.square);

collection.update( { "squares.number": square }, { $set: { "squares.$.colour" : data.colour } },function(err,document){
   
socket.broadcast.emit("changed", data);
    

    
})
    
});

});
};