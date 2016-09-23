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
  }

}

var updateColour = function () {

  var colours = getColours();

  document.getElementById("current").style.backgroundColor = "rgb(" + colours.red + "," + colours.green + "," + colours.blue + ")";

}

if (sliders[0].type === "range") {

  for (var i = 0; i < sliders.length; i += 1) {

    sliders[i].addEventListener("change", function (e) {

      var value = e.target.value;
      var colour = document.getElementsByName(e.target.name.replace("slide-", ""))[0];

      colour.value = value;

      updateColour();

    })

  }

  // Range type supported, enable range type

  document.getElementById("sliders").className += " visible";
  document.getElementById("sliders").style.display = "block";


}
