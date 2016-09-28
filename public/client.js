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

// Pulse

window.setInterval(function () {

  try {

    // Double, dashed, dotted (solid to start)

    var decay = [5, 30, 60];

    var squares = document.querySelectorAll(".square time");

    for (var i = 0; i < squares.length; i += 1) {

      var timestamp = new Date(squares[i].getAttribute("datetime"));

      var timeDiff = Math.floor(((Math.abs(timestamp - Date.now())) / 1000) / 60); // Timedif in seconds

      var square = squares[i].parentNode;

      if (timeDiff < decay[0]) {

        square.className = "square decay-0";

      } else if (timeDiff < decay[1]) {

        square.className = "square decay-1";

      } else if (timeDiff < decay[2]) {

        square.className = "square decay-2";

      } else {

        square.className = "square decay-3";

      }

    }

  } catch (e) {

    // Browser does not support queryselector.

  }

}, 500);

var updateColour = function () {

  var colours = getColours();

  document.getElementById("current").style.backgroundColor = "rgb(" + colours.red + "," + colours.green + "," + colours.blue + ")";

};

document.getElementById("red").addEventListener("change", updateColour);
document.getElementById("green").addEventListener("change", updateColour);
document.getElementById("blue").addEventListener("change", updateColour);

if (sliders[0].type === "range") {

  var changeSlider = function (e) {

    var value = e.target.value;
    var colour = document.getElementsByName(e.target.name.replace("slide-", ""))[0];

    colour.value = value;

    updateColour();

  };

  for (var i = 0; i < sliders.length; i += 1) {

    sliders[i].addEventListener("change", changeSlider);

    // Range type supported, enable range type

    document.getElementById("sliders").className += " visible";
    document.getElementById("sliders").style.display = "block";

  }

}

var lightSquare = function (square) {

  var target = document.getElementsByName("square")[square.id - 1];

  target.firstElementChild.setAttribute("datetime", square.machineTime);

  target.innerHTML = square.contents;

  target.style.backgroundColor = "rgb(" + square.colour.red + "," + square.colour.green + "," + square.colour.blue + ")";

  target.style.borderColor = "rgb(" + square.author.red + "," + square.author.green + "," + square.author.blue + ")";

};

if (window.WebSocket) {

  document.getElementById("refresh").style.display = "none";

  var websocket = new WebSocket("ws://" + document.location.host);

  websocket.onmessage = function (evt) {

    var square;

    try {

      square = JSON.parse(evt.data);

    } catch (e) {

      console.log(e);

    }

    if (square) {

      lightSquare(square);

    }

  };

  websocket.onopen = function () {

    websocket.send(squarefieldName);

  };

  // Allow light without refresh

  var squares = document.querySelectorAll(".square");

  var sendRequest = function (event) {

    var red = document.getElementById("red").value;
    var green = document.getElementById("green").value;
    var blue = document.getElementById("blue").value;

    var square = event.currentTarget.value;

    var string = "square=" + square + "&red=" + red + "&green=" + green + "&blue=" + blue;

    var http = new XMLHttpRequest();
    http.open("POST", document.location.pathname, true);
    http.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    var params = string;

    http.send(params);

    event.preventDefault();
    return false;

  };

  for (var i = 0; i < squares.length; i += 1) {

    squares[i].addEventListener("click", sendRequest, false);

  }

}
