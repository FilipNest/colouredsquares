//Load socket.io

var socket = io();

//Send url once connected

//Get cookie function

function getCookie(cookie) {
    var name = cookie + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1);
        if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
    }
    return null;
}

//Session settings

session = {

    userid: getCookie("csid"),
    userkey: getCookie("cskey"),
    colour: "rgb(255,255,255)",
    squarefield: null,

};

var user

socket.on('connect', function (data) {
    socket.emit('hello', {
        userid: session.userid,
        userkey: session.userkey,
        squarefield: document.location.pathname.substring(1)
    });
});

//Load requested squarefield

socket.on('load', function (data) {

    if (data) {

        session.squarefield = data._id;
        document.title = "Coloured Squares:" + " " + data.name;
        document.querySelector("#name").innerHTML = data.name;

        //Clear field if already exists

        document.querySelector("#squarefield").innerHTML = "";

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

    } else {

        document.write("404");

    }

});

socket.on("guest", function () {

    socket.emit("load", {
        userid: null,
        userkey: null,
        squarefield: document.location.pathname.substring(1)
    });

});

socket.on("404", function (name) {

    document.write(name + " is not a valid squarefield");

});

var squareclick = function (square) {

    var id = square.getAttribute("id").replace("s", "");

    square.style.background = session.colour;
    square.setAttribute("data-author", session.username);
    socket.emit("light", {
        squarefield: session.squarefield,
        square: id,
        colour: session.colour,
        userid: session.userid,
        userkey: session.userkey
    })

};

//Change square when changed on server

socket.on("light", function (data) {
    
    if (data.squarefield === session.squarefield) {

        var square = document.querySelector("#s" + data.number);
        
        square.style.background = data.colour;
        
        //Set authorship

        square.setAttribute("data-author", data.author);
        square.innerhtml = "<span class='author'>" + data.author + "</span>";

    }

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

    document.querySelector("#preview").style.backgroundImage = "url('images/" + url + ".jpg')";

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

socket.on("signedin", function (user) {

    session.username = user.name;
    session.userid = user.id;
    session.key = user.key;
    document.cookie = "cskey=" + user.key;
    document.cookie = "csid=" + user.id;

    document.getElementById("signinform").style.display = "none";
    document.getElementById("me").style.display = "block";

    document.querySelector(".me").innerHTML = session.username;

    socket.emit("load", {
        userid: user.id,
        userkey: user.key,
        squarefield: document.location.pathname.substring(1)
    });

});

//Navigation

var menu = function (which) {

    var toggled = document.getElementById(which);

    document.getElementById("squarefield").setAttribute("class", "menu");

    if (toggled.getAttribute("class") === "content on") {

        var on = true;
        document.getElementById("squarefield").setAttribute("class", "");

    }

    var panels = document.querySelectorAll("#panel .content");

    var i;

    for (i = 0; i < panels.length; i += 1) {

        panels[i].setAttribute("class", "content");

    }

    if (!on) {
        toggled.setAttribute("class", "content on");

    }
};