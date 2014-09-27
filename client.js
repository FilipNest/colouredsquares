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

square.style.backgroundColor = session.colour;
    
socket.emit("squarechange",{squarefield:session.squarefield,square:id,colour:session.colour})
    
};

//Change square when changed on server

socket.on("changed",function(data){
    
document.querySelector("#s"+data.square).style.backgroundColor = data.colour;
    
});

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

var sliders = document.querySelectorAll('input[type=range]'), i;

for (i = 0; i < sliders.length; ++i) {
  sliders[i].oninput = function(){

var red = document.querySelector('input[type=range].red').value;
var green = document.querySelector('input[type=range].green').value;
var blue = document.querySelector('input[type=range].blue').value;
      
session.colour = "rgb("+red+","+green+","+blue+")";
    
document.querySelector("#mixed").style.backgroundColor = session.colour;
    
  }
}