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
    
    if(newname.length > 15){
     
        problem("Try something a little shorter");
        return false;
    }
  
  if(newname.length === 0){
    
    problem("You have to pick a name.")
    return false;
    
  };

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

    session.fieldfriends = data.friends;
    
    document.getElementById("favouritedcount").innerHTML = data.friendcount;

    document.getElementById("favouritecount").innerHTML = data.friends.length;

    //Check if user has been favourited by the field

    if (session.id && data.friends.indexOf(session.id) !== -1) {

        document.getElementById("favourite").style.borderColor = "orangered";

    };

    //Check if user has favourited the field

    if (session.id && session.friends.indexOf(data._id) !== -1) {

        document.getElementById("favourite").style.backgroundColor = "orangered";

    };

    if (session.id) {

        document.getElementById("favourite").onclick = function () {

            socket.emit("favourite", session);

        };

    } else {

        document.getElementById("favourite").onclick = function () {

         problem("Please log in to befriend a squarefield");

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

            switch (data.squares[index].view) {
            case 0:
                data.squares[index].view = "Anyone"
                break;
            case 1:
                data.squares[index].view = "Signed in"
                break;
            case 2:
                data.squares[index].view = "Friends"
                break;
            case 3:
                data.squares[index].view = "Owner"
                break;
            };

            switch (data.squares[index].edit) {
            case 0:
                data.squares[index].edit = "Anyone"
                break;
            case 1:
                data.squares[index].edit = "Signed in"
                break;
            case 2:
                data.squares[index].edit = "Friends"
                break;
            case 3:
                data.squares[index].edit = "Owner"
                break;
            };


            square.innerHTML = "<span class='access'>See:" + data.squares[index].view + " Paint:" + data.squares[index].edit + "</span><span class='author'><a href='" + link + "'>" + data.squares[index].authorname + "</a></span><span class='timestamp'>" + moment(date).fromNow() + "</span>";
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
    document.querySelector("menu").setAttribute("class","");
        
    session.locking = document.getElementById("locks").value;
    mobiletoggle("userpanel");

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
        square.setAttribute("data-updated", data.updated)
        square.setAttribute("data-view", data.view);
        square.setAttribute("data-edit", data.edit)

        switch (data.view) {
        case 0:
            data.view = "Anyone"
            break;
        case 1:
            data.view = "Signed in"
            break;
        case 2:
            data.view = "Friends"
            break;
        case 3:
            data.view = "Owner"
            break;
        };

        switch (data.edit) {
        case 0:
            data.edit = "Anyone"
            break;
        case 1:
            data.edit = "Signed in"
            break;
        case 2:
            data.edit = "Friends"
            break;
        case 3:
            data.edit = "Owner"
            break;
        };

        if (session.info) {

            square.innerHTML = "<span class='access' style='display:block'>See:" + data.view + " Paint:" + data.edit + "</span><span style='display:block' class='author'>" + data.authorname + "</span></span><span style='display:block' class='timestamp'>" + moment(date).fromNow() + "</span>";

        } else {

            square.innerHTML = "<span class='access'>See:" + data.view + " Paint:" + data.edit + "</span><span class='author'>" + data.authorname + "</span></span><span class='timestamp'>" + moment(date).fromNow() + "</span>";

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
    
    window.setTimeout(function(){
    mobiletoggle("colour");
    },10);

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
    
    mobiletoggle("colour");

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
    
    mobiletoggle("picture");

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
    
    if(email.length < 1){
      
        problem("Did you enter an email address?");
        
    };
    
    if(password.length < 3){
     
        problem("Did you enter a password?");
        
    }
        
    };

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
    document.getElementById("fieldlist").setAttribute("class", "menu");

    if (toggled.getAttribute("class") === "content on") {

        var on = true;
        document.getElementById("squarefield").setAttribute("class", "");
        document.getElementById("fieldlist").setAttribute("class", "");

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

    var i;

    for (i = 0; i < 255; i += 1) {

        date = new Date(parseInt(document.getElementById("s" + i).getAttribute("data-updated")));

        document.querySelector("#s" + i + " .timestamp").innerHTML = moment(date).fromNow();

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
            document.querySelector("#s" + i + " .access").style.display = "block";
        } else {
            document.querySelector("#s" + i + " .timestamp").style.display = "none";
            document.querySelector("#s" + i + " .author").style.display = "none";
            document.querySelector("#s" + i + " .access").style.display = "none";

        }
    };

}

socket.on("problem", function (data) {

    problem(data);

});

var problem = function(message){
    
   document.getElementById("error").innerHTML = message;
    document.getElementById("error").setAttribute("class", "on");

    window.setTimeout(function () {

        document.getElementById("error").setAttribute("class", "");

    }, 3000); 
    
};

var showlatest = function () {

    socket.emit("fieldfetcher", {
        id: session.id
    });

};

socket.on("fetched", function (result) {

    document.getElementById("squarefield").style.display = "none";
    document.getElementById("fieldlist").style.display = "block";
    
    //Clear any previous results
    
    document.getElementById("fieldlist").innerHTML = "";

    //Loop over returned results

    result.forEach(function (element, index) {

        document.getElementById("fieldlist").innerHTML += "<div class='square' style='background:"+element.square.colour+"'>"+"<a class='name' href='"+element.name+"'>"+element.name+"</a></div>";

    });

});

var showsquarefield = function () {

    document.getElementById("squarefield").style.display = "block";
    document.getElementById("fieldlist").style.display = "none";

};

var showfriended = function(){
  
    socket.emit("fieldfetcher", {
        id: session.id,
        query: session.fieldfriends
    });
    
};

var mobiletoggle = function(which){
    
  if(window.innerWidth < 400){
    
      menu(which);
      
  };
    
};