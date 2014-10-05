//Load socket.io

var socket = io();

//Send url once connected

socket.on('hello', function (data) {
    console.log(data);
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
document.querySelector("#title").innerHTML = data.name;
document.querySelector("#description").innerHTML = data.description;

    
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
    
}else{

document.title = "Coloured Squares: 404";
document.querySelector("#title").innerHTML = "404";
document.querySelector("#description").innerHTML = "Squarefield not found";
 
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

//Navigation

var menu = function(what,where){
    
var buttons = document.querySelectorAll('nav button'), content = document.querySelectorAll('.content'), i;

for (i = 0; i < buttons.length; ++i) {
  buttons[i].setAttribute("class","");
}
    
for (i = 0; i < content.length; ++i) {
  content[i].style.display = "none";
}

what.setAttribute("class","active");

document.querySelector("#"+where).style.display = "block";
    
};

//Hide

document.querySelector("#palette").onclick = function(e){

var button = document.querySelector("#palette");
var panel = document.querySelector("#panel");
    
if(button.getAttribute("class") === "on"){
    
button.setAttribute("class","off");
panel.setAttribute("class","off");
    
}else{
 
button.setAttribute("class","on");
panel.setAttribute("class","on");
    
}
    
};

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
    var canvas = document.createElement('CANVAS');
    var ctx = canvas.getContext('2d');
    var img = new Image;
    img.onload = function () {
        canvas.height = 100;
        canvas.width = 100;
        ctx.drawImage(img, 0, 0, 100, 100)
        var dataURL = canvas.toDataURL(outputFormat || 'image/png');
        callback.call(this, dataURL);
        // Clean up
        canvas = null;
    };
    img.src = src;
}
    
var convert = function convert(file) {

var file = file.files[0];
var preview = document.querySelector("#preview");
  
var reader  = new FileReader();

reader.onloadend = function () {
convertImgToBase64(reader.result, function (base64Img) {
preview.src = reader.result;        
session.image = base64Img;

});
  
  }

  if (file) {

reader.readAsDataURL(file);

  } else {
    preview.src = "";
  }
}

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
document.querySelector("#personal").innerHTML = "<h2>Hello " + user.name + "</h2>";
    
if(user.first){
 
document.querySelector("#personal").innerHTML += "First log in!";
    
}
    
});

socket.on("signedup",function(){

signin();

});