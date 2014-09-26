//Load socket.io

var socket = io();

//Send url once connected

socket.on('hello', function (data) {
    console.log(data);
    socket.emit('fetch', window.location.href);
});

//Load requested squarefield

socket.on('load',function(data){
    
document.write(data);
    
});