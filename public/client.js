// Check if browser supports range input type

var sliders = [document.getElementById("slide-red"), document.getElementById("slide-blue"), document.getElementById("slide-green")];

if (sliders[0].type === "range") {

  for (var i = 0; i < sliders.length; i += 1) {

    sliders[i].addEventListener("change", function (e) {

      var value = e.target.value;
      var colour = document.getElementsByName(e.target.name.replace("slide-", ""))[0];

      colour.value = value;

    })

  }

  // Range type supported, enable range type

  document.getElementById("sliders").className += " visible";
  document.getElementById("sliders").style.display = "block";


}
