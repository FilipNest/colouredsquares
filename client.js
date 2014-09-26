//Load socket.io

var socket = io();

//Send url once connected

socket.on('hello', function (data) {
    console.log(data);
    socket.emit('fetch', window.location.href);
});

//Load requested squarefield

socket.on('load',function(data){

if(data[0]){
document.write("Loaded" + " " + data[0].name);    
}else{
 
document.write("Failed to load. Does this squarefield exist?");
    
}
    
});