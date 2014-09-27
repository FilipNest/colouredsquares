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
session.colour = "red";

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

var colour = "red";

var squareclick = function(square){
    
var id = square.getAttribute("id").replace("s","");

square.style.backgroundColor = session.colour;
    
socket.emit("squarechange",{squarefield:session.squarefield,square:id,colour:session.colour})
    
};

//Change square when changed on server

socket.on("changed",function(data){
    
document.querySelector("#s"+data.square).style.backgroundColor = data.colour;
    
});