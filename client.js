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

socket.on('load', function (data) {

  if (data) {

    session.squarefield = data.name;
    document.title = "Coloured Squares:" + " " + data.name;
    document.querySelector("#name").innerHTML = data.name;


    data.squares.forEach(function (element, index) {

      //Set guest author

      if (!data.squares[index].author) {
        data.squares[index].author = "guest";
      }

      var square = document.createElement("div");
      square.setAttribute("id", "s" + index);
      square.setAttribute("class", "square");
      square.setAttribute("data-access", data.squares[index].access);
      square.setAttribute("data-author", data.squares[index].author);
      square.innerHTML = "<span class='author'>" + data.squares[index].author + "</span>";
      square.style.background = data.squares[index].colour;

      square.onclick = function (square) {

        squareclick(square.target);

      };

      document.querySelector("#squarefield").appendChild(square);

    });

  }

});

var squareclick = function (square) {

  var id = square.getAttribute("id").replace("s", "");

  square.style.background = session.colour;
  square.setAttribute("data-author", session.username);
  socket.emit("squarechange", {
    squarefield: session.squarefield,
    square: id,
    colour: session.colour,
    user: session.userid
  })

};

//Change square when changed on server

socket.on("changed", function (data) {

  var square = document.querySelector("#s" + data.square.square);

  square.style.background = data.square.colour;

  //Set authorship

  square.setAttribute("data-author", data.user);
  square.innerhtml = "<span class='author'>" + data.user + "</span>";



});

//Colour sliders

var setcolour = function () {

  var red = document.querySelector('input[type=range].red').value;
  var green = document.querySelector('input[type=range].green').value;
  var blue = document.querySelector('input[type=range].blue').value;

  document.querySelector("#mixed").style.background = "rgb(" + red + "," + green + "," + blue + ")";

};

//Select colour

document.querySelector("#mixed").onclick = function (e) {

  session.colour = e.target.style.background;

};


var convert = function convert(file) {

  var file = file.files[0];

  var reader = new FileReader();

  reader.onloadend = function () {
    
      document.querySelector("#preview").style.backgroundImage = "url('icons/waiting.png')";
      
      socket.emit("upload", reader.result);

  }

  if (file) {

    reader.readAsArrayBuffer(file);

  }

}

//Get image

socket.on("uploaded", function (url) {

document.querySelector("#preview").style.backgroundImage = "url('images/"+url+".jpg')";
  
  session.image = "images/" + url + ".jpg";
  
});

//Select converted image

document.querySelector("#preview").onclick = function (what) {
  if (session.image) {
    session.colour = "url(" + session.image + ")";
  
  }
};

//Sign up and sign in functions

//Write password

session.password = "";

var passinput = function (colour) {

  var picked = document.querySelector("#passwordpicked");

  if (session.password.length > 3) {

    session.password = "";
    picked.innerHTML = "";

  }

  session.password += colour.charAt(0);

  picked.innerHTML += "<br />" + colour;

}

var signin = function () {

  var user = {};
  user.email = document.querySelector("#email").value;
  user.password = session.password;

  socket.emit("signin", user);

};

var signup = function () {

  var user = {};
  user.email = document.querySelector("#email").value;
  user.password = session.password;

  socket.emit("signup", user);

};

var checkuser = function () {
  socket.emit("checkuser");

  socket.on("currentuser", function (data) {

    console.log(data);

  });
  
  return "checking";
};

socket.on("signedin", function (user) {

  session.username = user.name;
  session.userid = user.id;

  //Returning user

  if (!user.first) {
    document.querySelector("#personal").innerHTML = "<h2>" + user.name + "</h2>";
    document.querySelector("#personal").innerHTML += "<br /><button>Edit name, password and email</button><br /><a href='" + user.name + "'>Visit your home squarefield</a>";
  } else {

    //New user

    document.querySelector("#personal").innerHTML = "<h2>Welcome to your own little part of Coloured Squares</h2><p>Your username is currently &ldquo;" + user.name + "&rdquo;. Change it to something more memorable below. One word, under 15 charcaters.</p><input id='newusername'/><br /><button onclick=changeusername(this)>Change username</button>";

  }

});

var changeusername = function (field) {

  socket.emit("changeusername", {
    user: session.userid,
    newusername: document.querySelector("#newusername").value
  });

};

socket.on("signedup", function () {

  signin();

});

//Navigation

var menu = function (which) {

  var toggled = document.getElementById(which);
  
document.getElementById("squarefield").setAttribute("class","menu");

  if (toggled.getAttribute("class") === "content on") {

    var on = true;
    document.getElementById("squarefield").setAttribute("class","");

  }

  var panels = document.querySelectorAll("#panel .content");

  var i;

  for (i = 0; i < panels.length; i += 1) {

    panels[i].setAttribute("class","content");

  }

  if (!on) {
    toggled.setAttribute("class","content on");
    
  }
};