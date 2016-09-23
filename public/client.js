// Check if browser supports range input type

var sliders = [document.getElementById("slide-red"), document.getElementById("slide-blue"), document.getElementById("slide-green")];

var getColours = function () {

  var red = document.getElementsByName("red")[0].value;
  var green = document.getElementsByName("green")[0].value;
  var blue = document.getElementsByName("blue")[0].value;

  return {
    red: red,
    green: green,
    blue: blue
  };

};

var updateColour = function () {

  var colours = getColours();

  document.getElementById("current").style.backgroundColor = "rgb(" + colours.red + "," + colours.green + "," + colours.blue + ")";

};

if (sliders[0].type === "range") {

  var change = function (e) {

    var value = e.target.value;
    var colour = document.getElementsByName(e.target.name.replace("slide-", ""))[0];

    colour.value = value;

    updateColour();

  };

  for (var i = 0; i < sliders.length; i += 1) {

    sliders[i].addEventListener("change", change);

    // Range type supported, enable range type

    document.getElementById("sliders").className += " visible";
    document.getElementById("sliders").style.display = "block";

  }

}

var lightSquare = function (square) {

  var target = document.getElementsByName("square")[square.id - 1];

  target.style.backgroundColor = "rgb(" + square.colour.red + "," + square.colour.green + "," + square.colour.blue + ")";

  target.style.borderColor = "rgb(" + square.author.red + "," + square.author.green + "," + square.author.blue + ")";

}

if (window.WebSocket) {

  var websocket = new WebSocket("ws://" + document.location.host)

  websocket.onmessage = function (evt) {

    var square;

    try {

      square = JSON.parse(evt.data);

    } catch (e) {


    }

    if (square) {

      lightSquare(square);

    }

  }

}
