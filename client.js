//Load socket.io

var socket = io();

//Send url once connected

socket.on('hello', function (data) {
    console.log(data);
    socket.emit('fetch', window.location.href);
});

//Session settings

session = {};
session.squarefield = null;
session.colour = "rgb(255,0,0)";

//Load requested squarefield

socket.on('load',function(data){

if(data){

session.squarefield = data.name;
document.title = "Coloured Squares:"+" "+data.name;
    
data.squares.forEach(function(element,index){
    
var square = document.createElement("div");
square.setAttribute("id","s"+index);
square.setAttribute("class","square");
square.setAttribute("data-access",data.squares[index].access);

square.style.background = data.squares[index].colour;
    
square.onclick = function(square){
  
squareclick(square.target);
    
};

document.querySelector("#squarefield").appendChild(square);
    
});
    
}else{

document.write("Failed to load. Does this squarefield exist?");
    
}
    
});

var colour = "rgb(255,0,0)";

var squareclick = function(square){
    
var id = square.getAttribute("id").replace("s","");

square.style.background = session.colour;
    
socket.emit("squarechange",{squarefield:session.squarefield,square:id,colour:session.colour})
    
};

//Change square when changed on server

socket.on("changed",function(data){
    
document.querySelector("#s"+data.square).style.background = data.colour;
    
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
        canvas.height = 50;
        canvas.width = 50;
        ctx.drawImage(img, 0, 0, 50, 50 * img.height / img.width)
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