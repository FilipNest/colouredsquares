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

    id: getCookie("csid"),
    key: getCookie("cskey"),
    colour: "rgb(255,255,255)",
    squarefield: null,
    home: false,
    friends: null

};

socket.on('connect', function (data) {
    socket.emit('hello', {
        id: session.id,
        key: session.key,
        squarefield: document.location.pathname.substring(1)
    });
});

socket.on("favourite", function (data) {

    if (data.id === session.squarefield) {

        if (data.status) {

            document.getElementById("favourite").style.backgroundColor = "orangered";
            session.friends.push(data.id);

        } else {

            document.getElementById("favourite").style.backgroundColor = "white";
            session.friends.splice(session.friends.indexOf(data.id), 1);

        };

    };

});

var logout = function () {

    socket.emit("logout", session);

};

socket.on("logout", function () {

    session.username = null;
    session.id = null;
    session.key = null;
    session.friends = null;
    document.cookie = "cskey=" + "";
    document.cookie = "csid=" + "";

    document.getElementById("signinform").style.display = "block";
    document.getElementById("me").style.display = "none";

    document.querySelector(".me").innerHTML = "";

});

var changeusername = function () {

    var newname = document.getElementById("newusername").value;

    socket.emit("changename", {
        session: session,
        newname: newname
    });

};

socket.on("namechanged", function (name) {

    var url = document.location.protocol + "//" + document.location.host + "/" + name;

    document.location.href = url;

});

var gohome = function () {

    var url = document.location.protocol + "//" + document.location.host + "/" + session.username;

    document.location.href = url;

};

//Load requested squarefield

socket.on('load', function (data) {

    document.getElementById("favouritedcount").innerHTML = data.friendcount;

    document.getElementById("favouritecount").innerHTML = data.friends.length;

    //Check if user has been favourited by the field

    if (session.id && data.friends.indexOf(session.id) !== -1) {

        document.getElementById("favourite").style.borderColor = "orangered";

    };

    //Check if user has favourited the field

    if (session.id && session.friends.indexOf(data._id) !== -1) {

        document.getElementById("favourite").setAttribute("class", "on");

    };

    if (session.id) {

        document.getElementById("favourite").onclick = function () {

            socket.emit("favourite", session);

        };

    } else {

        document.getElementById("favourite").onclick = function () {

            alert("Please log in to favourite");

        };

    };

    if (data) {

        if (data._id === session.id) {

            session.home = true;
            document.getElementById("home").style.display = "block";
            document.getElementById("gohome").style.display = "none";



        } else {

            session.home = false;
            document.getElementById("home").style.display = "none";
            document.getElementById("gohome").style.display = "inline";

        }

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

            var link = data.squares[index].authorname;

            if (!data.squares[index].authorname) {

                data.squares[index].authorname = "guest";
                link = "coloured_squares";

            };

            date = new Date(parseInt(data.squares[index].timestamp));

            var square = document.createElement("div");
            square.setAttribute("id", "s" + index);
            square.setAttribute("class", "square");
            square.setAttribute("data-view", data.squares[index].view);
            square.setAttribute("data-edit", data.squares[index].edit);
            square.setAttribute("data-author", data.squares[index].author);
            square.setAttribute("data-authorname", data.squares[index].authorname);
            square.setAttribute("data-updated", data.squares[index].updated);
            square.innerHTML = "<span class='author'><a href='" + link + "'>" + data.squares[index].authorname + "</a></span><span class='timestamp'>" + moment(date).fromNow() + "</span>";
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

    session.id = null;

    socket.emit("load", {
        id: null,
        key: null,
        squarefield: document.location.pathname.substring(1)
    });

});

socket.on("404", function (name) {

    document.write(name + " is not a valid squarefield");

});

var lockselect = function () {

    document.querySelector("menu").style.backgroundColor = "white";
    session.locking = document.getElementById("locks").value;

};

var squareclick = function (square) {

    var id = square.getAttribute("id").replace("s", "");

    if (session.locking) {

        socket.emit("lock", {
            squarefield: session.squarefield,
            square: id,
            view: parseInt(session.locking.split("/")[0]),
            edit: parseInt(session.locking.split("/")[1]),
            id: session.id,
            key: session.key
        })

    } else {

        square.style.background = session.colour;
        square.setAttribute("data-author", session.username);
        socket.emit("light", {
            squarefield: session.squarefield,
            square: id,
            username: session.username,
            colour: session.colour,
            id: session.id,
            key: session.key
        })
    }
};

socket.on("favourited", function (count) {
    document.getElementById("favouritedcount").innerHTML = count;
});

//Change square when changed on server

socket.on("light", function (data) {

    if (data.squarefield === session.squarefield) {

        date = new Date(parseInt(data.timestamp));

        var square = document.querySelector("#s" + data.number);

        square.style.background = data.colour;

        if (!data.authorname) {

            data.authorname = "guest";

        };

        //Set authorship

        square.setAttribute("data-author", data.author);
        square.setAttribute("data-username", data.authorname)
        square.setAttribute("data-updated", data.timestamp)

        if (session.info) {

            square.innerHTML = "<span style='display:block' class='author'>" + data.authorname + "</span></span><span style='display:block' class='timestamp'>" + moment(date).fromNow() + "</span>";

        } else {

            square.innerHTML = "<span class='author'>" + data.authorname + "</span></span><span class='timestamp'>" + moment(date).fromNow() + "</span>";

        }

    }

});


//Image brightness detection function from Stack Overflow 13762864

function getImageLightness(imageSrc, callback) {
    var img = document.createElement("img");
    img.src = imageSrc;
    img.style.display = "none";
    document.body.appendChild(img);

    var colorSum = 0;

    img.onload = function () {
        // create canvas
        var canvas = document.createElement("canvas");
        canvas.width = this.width;
        canvas.height = this.height;

        var ctx = canvas.getContext("2d");
        ctx.drawImage(this, 0, 0);

        var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        var data = imageData.data;
        var r, g, b, avg;

        for (var x = 0, len = data.length; x < len; x += 4) {
            r = data[x];
            g = data[x + 1];
            b = data[x + 2];

            avg = Math.floor((r + g + b) / 3);
            colorSum += avg;
        }

        var brightness = Math.floor(colorSum / (this.width * this.height));
        callback(brightness);
    }
}

window.onload = function () {

    //Random slider values on load
    document.querySelector('input[type=range].red').value = (Math.random() * 256);
    document.querySelector('input[type=range].green').value = (Math.random() * 256);
    document.querySelector('input[type=range].blue').value = (Math.random() * 256);

    setcolour();

    document.querySelector("#mixed").click();

};

//Colour sliders

var setcolour = function () {

    var red = document.querySelector('input[type=range].red').value;
    var green = document.querySelector('input[type=range].green').value;
    var blue = document.querySelector('input[type=range].blue').value;

    document.querySelector("#mixed").style.background = "rgb(" + red + "," + green + "," + blue + ")";


};

//Select colour

document.querySelector("#mixed").onclick = function (e) {

    session.locking = null;

    session.colour = e.target.style.background;

    var red = document.querySelector('input[type=range].red').value;
    var green = document.querySelector('input[type=range].green').value;
    var blue = document.querySelector('input[type=range].blue').value;

    var yiq = ((red * 299) + (green * 587) + (blue * 114)) / 1000;

    if (yiq >= 128) {

        var lightordark = "dark";

    } else {

        var lightordark = "light";

    }


    document.querySelector("menu").style.background = "rgb(" + red + "," + green + "," + blue + ")";

    document.querySelector("menu").setAttribute("class", lightordark);
    document.querySelector("menu").style.backgroundImage = "none";

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


    session.locking = null;

    if (session.image) {
        session.colour = "url(" + session.image + ")";

    }

    getImageLightness(session.image, function (brightness) {
        if (brightness < 100) {

            document.querySelector("menu").setAttribute("class", "light");

        }

        document.querySelector("menu").style.backgroundImage = "url('" + session.image + "')";

    });

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
    session.id = user.id;
    session.key = user.key;
    session.friends = user.friends;
    document.cookie = "cskey=" + user.key;
    document.cookie = "csid=" + user.id;

    document.getElementById("signinform").style.display = "none";
    document.getElementById("me").style.display = "block";

    document.querySelector(".me").innerHTML = session.username;

    socket.emit("load", {
        id: user.id,
        key: user.key,
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

//Update timestamps

window.setInterval(function () {

    var timestamps = document.querySelectorAll(".timestamp"),
        i;

    for (i = 0; i < timestamps.length; i += 1) {

        date = new Date(parseInt(document.getElementById("s" + i).getAttribute("data-updated")));

        timestamps[i].innerHTML = moment(date).fromNow();

    };

}, 1000);

//Toggle info

var toggleinfo = function () {

    var status = document.getElementById("infotoggle").getAttribute("class");

    if (status === "off") {

        document.getElementById("infotoggle").setAttribute("class", "on");
        session.info = true;

    } else {

        document.getElementById("infotoggle").setAttribute("class", "off");
        session.info = false;

    }

    var i;

    for (i = 0; i < 255; i += 1) {

        if (status === "off") {
            document.querySelector("#s" + i + " .timestamp").style.display = "block";
            document.querySelector("#s" + i + " .author").style.display = "block";
        } else {
            document.querySelector("#s" + i + " .timestamp").style.display = "none";
            document.querySelector("#s" + i + " .author").style.display = "none";
        }
    };

}