//Load socket.io

var socket = io();

//Send url once connected

socket.on('hello', function (data) {
    socket.emit('fetch', window.location.href);
});

//Session settings

session = {};
session.username = "guest";
session.userid = null;
session.squarefield = null;
session.colour = "rgb(255,255,255)";

//Load requested squarefield

socket.on('load',function(data){
    
if(data){

session.squarefield = data.name;
document.title = "Coloured Squares:"+" "+data.name;
//document.querySelector("#title").innerHTML = data.name;
//document.querySelector("#description").innerHTML = data.description;

    
data.squares.forEach(function(element,index){
    
//Set guest author
    
if(!data.squares[index].author){
data.squares[index].author = "guest";    
}

var square = document.createElement("div");
square.setAttribute("id","s"+index);
square.setAttribute("class","square");
square.setAttribute("data-access",data.squares[index].access);
square.setAttribute("data-author",data.squares[index].author);
square.innerHTML = "<span class='author'>"+data.squares[index].author+"</span>";
square.style.background = data.squares[index].colour;
    
square.onclick = function(square){
  
squareclick(square.target);
    
};

document.querySelector("#squarefield").appendChild(square);
    
});
    
}
    
});

var squareclick = function(square){
    
var id = square.getAttribute("id").replace("s","");

square.style.background = session.colour;
square.setAttribute("data-author",session.username);    
socket.emit("squarechange",{squarefield:session.squarefield,square:id,colour:session.colour,user:session.userid})
 
};

//Change square when changed on server

socket.on("changed",function(data){
    
var square = document.querySelector("#s"+data.square.square);
    
square.style.background = data.square.colour;

//Set authorship
    
square.setAttribute("data-author",data.user);
square.innerhtml = "<span class='author'>"+data.user+"</span>";

    
    
});

//Colour sliders

var setcolour = function(){

var red = document.querySelector('input[type=range].red').value;
var green = document.querySelector('input[type=range].green').value;
var blue = document.querySelector('input[type=range].blue').value;
      
document.querySelector("#mixed").style.background = "rgb("+red+","+green+","+blue+")";
    
  }

//Select colour

document.querySelector("#mixed").onclick = function(e){
        
session.colour = e.target.style.background;
document.querySelector(".result").src = "";
document.querySelector(".result").style.background = session.colour;
    
};

//Convert image

   function convertImgToBase64(src, callback, outputFormat) {
var canvas = document.createElement("canvas");
var ctx = canvas.getContext("2d");

img = new Image();
img.onload = function () {

//Portrait
    
if(img.height > img.width){

canvas.width = 100;
canvas.height = canvas.width * (img.height / img.width);
    
}
 
//Landscape
    
if(img.width > img.height){

canvas.height = 100;
canvas.width = canvas.height * (img.width / img.height);
    
}

    /// step 1
    var oc = document.createElement('canvas'),
        octx = oc.getContext('2d');

    oc.width = canvas.height * 4;
    oc.height = canvas.height * 4;
    octx.drawImage(img, 0, 0, oc.width, oc.height);

    /// step 2
    octx.drawImage(oc, 0, 0, oc.width * 0.5, oc.height * 0.5);

    ctx.drawImage(oc, 0, 0, oc.width * 0.5, oc.height * 0.5,
    0, 0, canvas.width, canvas.height);
    
    var output = canvas.toDataURL();
    callback(output);
}
img.src = src;
}
    
var convert = function convert(file) {

var file = file.files[0];
var preview = document.querySelector("#preview");
  
var reader  = new FileReader();

reader.onloadend = function () {
convertImgToBase64(reader.result, function (base64Img) {

socket.emit("upload",base64Img);

});
  
  }

  if (file) {

reader.readAsDataURL(file);

  } else {
    preview.src = "";
  }
}

//Get image

socket.on("uploaded",function(url){
    
document.querySelector("#preview").src = "images/"+url+".jpg";
session.image = "images/"+url+".jpg";
});

//Select converted image

document.querySelector("#preview").onclick = function(what){
if(session.image){    
session.colour = "black url("+session.image+")";
document.querySelector(".result").src = session.image;
document.querySelector(".result").style.background = "black";
}
};

//Sign up and sign in functions

//Write password

session.password = "";

var passinput = function(colour){
    
var picked = document.querySelector("#passwordpicked");

if(session.password.length > 3){
    
session.password = "";
picked.innerHTML = "";
    
}
    
session.password += colour.charAt(0);
        
picked.innerHTML += "<br />" + colour;
    
}

var signin = function(){
    
var user = {};
user.email = document.querySelector("#email").value;
user.password = session.password;
    
socket.emit("signin",user);    
    
};

var signup = function(){

var user = {};
user.email = document.querySelector("#email").value;
user.password = session.password;
    
socket.emit("signup",user);
    
};

var checkuser = function(){
socket.emit("checkuser");

socket.on("currentuser",function(data){

console.log(data);
    
})
return "checking";
};

socket.on("signedin",function(user){
    
session.username = user.name;
session.userid = user.id;

//Returning user
    
if(!user.first){    
document.querySelector("#personal").innerHTML = "<h2>"+user.name+"</h2>";
document.querySelector("#personal").innerHTML += "<br /><button>Edit name, password and email</button><br /><a href='"+user.name+"'>Visit your home squarefield</a>";
}else{
 
//New user
    
document.querySelector("#personal").innerHTML = "<h2>Welcome to your own little part of Coloured Squares</h2><p>Your username is currently &ldquo;"+user.name+"&rdquo;. Change it to something more memorable below. One word, under 15 charcaters.</p><input id='newusername'/><br /><button onclick=changeusername(this)>Change username</button>";
    
};
    
});

var changeusername = function(field){
    
socket.emit("changeusername", {user:session.userid, newusername: document.querySelector("#newusername").value});
    
};

socket.on("signedup",function(){

signin();

});