cs.lightSquare = function (square) {

  var inner = document.getElementById("inner_" + square.id);
  var author = document.getElementById("author_" + square.id);

  inner.style.backgroundColor = "rgba(" + square.colours.red + "," + square.colours.green + "," + square.colours.blue + ", 1)";

  inner.setAttribute("data-date", square.date)

  author.style.borderColor = "rgba(" + square.author.red + "," + square.author.green + "," + square.author.blue + ", 1)";

  getTiming(square.id);

}

if (window.WebSocket) {
  document.getElementById("squarefield").onsubmit = function (event) {

    var target = event.explicitOriginalTarget || event.relatedTarget ||
      document.activeElement || undefined;
    
    if (target) {

      var red = document.getElementById("red").value;
      var green = document.getElementById("green").value;
      var blue = document.getElementById("blue").value;

      var square = target.name;

      var string = target.name + "=&red=" + red + "&green=" + green + "&blue=" + blue;

      var http = new XMLHttpRequest();
      http.open("POST", document.location.pathname, true);
      http.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
      var params = string;

      http.send(params);

      event.preventDefault();

    }

  }

  var websocket = new WebSocket("ws://" + document.location.host)

  websocket.onmessage = function (evt) {

    var square;

    try {

      square = JSON.parse(evt.data);

    } catch (e) {


    }
    
    cs.lightSquare(square);

  }

  websocket.onopen = function () {

    websocket.send(JSON.stringify({
      "pair": cs.squarefield
    }));

  }

}

var getTiming = function (squareID) {

  var square = document.getElementById("inner_" + squareID);
  var date = square.getAttribute("data-date");
  var age = Date.now() - date;
  
  if (age < cs.ages[0]) {

    square.className = "inner age0";

  } else if (age < cs.ages[1]) {

    square.className = "inner age1";

  } else if (age < cs.ages[2]) {

    square.className = "inner age2";

  } else if (age < cs.ages[3]) {

    square.className = "inner age3";

  } else {

    square.className = "inner age4";

  }

}

setInterval(function () {

  for (var i = 0; i < 16; i += 1) {

    getTiming(i);

  }

},10)
