var settings = require('./settings.secret');
var fs = require("fs");
var gm = require('gm');
var crypto = require('crypto');


//Connect to database and trigger ready event when done;

require('mongodb').MongoClient.connect(settings.mongo, function (err, db) {
    if (err) throw err;

    //TEMPORARY CLEARING OF DATABASE BEFORE EACH RUN

    db.collection('squarefields').remove(function () {

        db.collection('users').remove(function () {

            db_ready(db);

        });

    });

})

var db_ready = function (db) {

    console.log("Ready...");

    //Required modules

    var app = require('http').createServer(handler)
    var io = require('socket.io')(app);
    var ObjectID = require('mongodb').ObjectID;
    var fs = require('fs');
    var url = require('url');
    var format = require('util').format;

    /*

    SERVER ROUTING

    */

    //Listen to port in settings file

    app.listen(settings.port);

    //HTTP request handling

    function handler(req, res) {

        //Ignore favicon

        if (req.url !== "favicon.ico") {

            //Redirect document root to home page

            if (req.url === "/") {

                req.url = "/index.html";

            }

            //Check if file exists, if so, load it. If not use routing. 

            fs.exists(__dirname + req.url, function (exists) {
                if (!exists) {

                    //Redirect to home

                    req.url = "/index.html";

                }

                fs.readFile(__dirname + req.url,
                    function (err, data) {
                        if (err) {

                            res.end("File didn't load but exists!?");

                        } else {

                            //Get extension of app files and send relevant file type 

                            var extension = req.url.split(".")[1];

                            //Set default type

                            var type = "text";

                            //Change type depending on extention

                            switch (extension) {

                            case "png":
                                type = "image/png";
                                break;
                            case "js":
                                type = "application/javascript";
                                break;
                            case "html":
                                type = "text/html";
                                break;
                            case "css":
                                type = "text/css";
                                break
                            }

                            //Send file, unless it's a secret like the settings file

                            if (extension !== "secret") {
                                res.writeHead(200, {
                                    'Content-Type': type,
                                    'Content-Length': data.length
                                });
                                res.write(data);
                                res.end();
                            } else {

                                // Access denied

                                res.writeHead(403);
                                res.end("Not like this.");

                            }
                        }
                    });


            });

        }
    }

    /*

    Coloured Squares functions

    */

    //Wrapper object

    cs = {};

    //Currently logged in users object

    var activeusers = {};

    //Make secure token

    cs.makekey = function (userid, callback) {

        crypto.randomBytes(48, function (ex, buf) {
            activeusers[userid] = buf.toString('hex');
            callback(activeusers[userid]);

        });

    };

    cs.authcheck = function (id, key) {

        if (activeusers[id] && activeusers[id] === key) {

            return true;

        } else {

            return false;

        }

    }

    cs.users = db.collection('users');
    cs.fields = db.collection('squarefields');

    //Check if username exists

    cs.userexists = function (name, callback) {

        cs.users.findOne({
            name: name
        }, function (err, document) {

            if (document) {

                callback(true);

            } else {

                callback(false);

            }

        });
    }

    //Create user

    cs.createUser = function (name, email, password, callback) {

        if (!callback) {

            callback = function () {};

        }

        cs.userexists(name, function (exists) {

            if (!exists) {

                cs.fetchUserbyEmail(email, function (exists) {

                    if (!exists) {

                        //Database check passed. Still need content validation.

                        cs.users.insert({
                            name: name,
                            password: password,
                            email: email,
                            friends: []
                        }, function (err, document) {

                            console.log("User " + name + " created");
                            callback(document);

                        });

                    } else {

                        console.log("email already in use");
                        callback(false)

                    }
                });


            } else {

                console.log("User already exists");
                callback(false);
            }

        })

    };

    cs.updateUser = function (currentname, currentemail, name, password, email, friends, callback) {

        if (!callback) {

            callback = function () {};

        }

        cs.userexists(name, function (exists) {

            if (!exists || name === currentname) {

                cs.fetchUserbyEmail(email, function (exists) {

                    if (!exists || email === currentemail) {
                        cs.users.update({
                            name: currentname
                        }, {
                            name: name,
                            email: email,
                            password: password,
                            friends: friends,
                        }, function (err, document) {

                            console.log("updated");
                            callback(document);

                        })
                    } else {

                        console.log("email in use");
                        callback(false);
                    }
                });
            } else {

                console.log("Name already in use");
                callback(false);
            }
        })
    };

    //Check if squarefield exists

    cs.squarefieldexists = function (name, callback) {

        cs.fields.findOne({
            name: name
        }, function (err, document) {

            if (document) {

                callback(true);

            } else {

                callback(false);

            }

        });
    }

    //Create new squarefield

    cs.createSquarefield = function (name, owner, callback) {

        if (!callback) {

            callback = function () {};

        }

        cs.squarefieldexists(name, function (exists) {

            if (!exists) {

                var i, squares = [];
                for (i = 0; i < 256; i += 1) {

                    squares.push({
                        number: i,
                        colour: "transparent",
                        image: null,
                        access: {
                            public: 2,
                            friends: 2
                        },
                        author: "Server"
                    });

                }

                var field = {
                    name: name,
                    owner: owner,
                    friends: [],
                    squares: squares,
                    updated: null
                };

                cs.fields.insert(field, function (err, document) {

                    console.log("Created squarefield");

                    callback(document);

                });

            } else {

                console.log("Already exists");
                return false;

            };

        });

    };

    //Update squarefield

    cs.updateSquarefield = function (currentname, currentowner, name, owner, friends, callback) {

        if (!callback) {

            callback = function () {};

        }

        cs.squarefieldexists(name, function (exists) {

            if (name === currentname || !exists) {

                cs.userexists(owner, function (exists) {

                    if (exists) {

                        cs.fields.update({
                            name: currentname
                        }, {
                            $set: {
                                name: name,
                                owner: owner,
                                friends: friends
                            }
                        }, function (err, document) {

                            //Updated squarefield
                            callback(document);
                        })


                    } else {

                        // Owner doesn't exist
                        return false;
                    }

                });

            } else {

                // Squarefield doesn't exist
                return false;

            };

        });

    };

    //Fetch user by email

    cs.fetchUserbyEmail = function (email, callback) {

        cs.users.findOne({
            email: email
        }, function (err, document) {

            if (document) {
                callback(document);
            } else {

                callback(false);

            }

        });

    };

    //Fetch user by id

    cs.fetchUserbyID = function (id, callback) {

        if (id) {
            id = ObjectID.createFromHexString(id);
        } else {
            callback(false);
        }

        cs.users.findOne({
            _id: id
        }, function (err, document) {
            callback(document);
        });

        return true;
    };

    //Fetch squarefield

    cs.fetchSquarefield = function (name, callback) {

        cs.fields.findOne({
            name: name
        }, function (err, document) {

            callback(document);

        });

        callback(false);
    };

    //Light up square

    cs.light = function (squarefield, square, colour, userid, callback) {

        if (!callback) {

            callback = function () {};

        }

        cs.fetchSquarefield(squarefield, function (result) {

            if (result) {

                cs.fields.update({
                    name: squarefield,
                    "squares.number": square
                }, {
                    $set: {
                        "squares.$.colour": colour,
                        "squares.$.author": userid
                    }
                }, function (err, document) {

                    callback(document);

                })
            } else {

            }

        });

    };


    //Create root user and home squarefield if they don't already exist

    cs.createUser("root", "filip@bluejumpers.com", "rgbw", function (result) {

        if (result) {
            cs.createSquarefield("Coloured Squares", "root");
        }
    });

    /*

    WEBSOCKETS
    Server, meet client.

    */

    io.on('connection', function (socket) {

        //When user fetches squarefield, parse the url they send and send the relevant squarefield data

        socket.on('hello', function (data) {

            cs.checkin(data);

            //Load home if no squarefield

            if (!data.squarefield) {

                data.squarefield = "Coloured Squares";

            }

            cs.fetchSquarefield(data.squarefield, function (document) {

                if (document) {
                    socket.emit("load", document);
                } else {
                    socket.emit("load", null);
                }
            });

        });

        //Change squarefield in database when clicked

        socket.on("squarechange", function (data) {

            data.square = parseInt(data.square);

            //Get user from ID for proper attribution of square

            cs.fetchUserbyID(data.user, function (user) {

                if (!user) {
                    var user = {
                        name: "guest"
                    };
                }

                cs.light(data.squarefield, data.square, data.colour, socket.user, function (result) {
                    if (result) {
                        socket.broadcast.emit("changed", {
                            square: data,
                            user: user.name
                        });
                    }
                });

            })

        })


        socket.on("signup", function (data) {

            cs.fetchUserbyEmail(data.email, function (result) {

                if (!result) {

                    //Set username as total user count

                    cs.users.count(function (error, total) {

                        var username = total.toString();

                        cs.createUser(username, data.email, data.password, function () {

                            socket.emit("signedup");

                        });

                    })

                } else {

                    console.log("email already in use");

                }

            })

        });

        cs.checkin = function (data) {

            //email,password,id,key

            if (data.password && data.email) {

                cs.fetchUserbyEmail(data.email, function (user) {

                    if (!user) {

                        console.log("user doesn't exist");

                    } else if (user.password === data.password) {

                        //Sign in through form

                        cs.makekey(user._id, function (key) {

                            socket.emit("signedin", {
                                name: user.name,
                                id: user._id,
                                key: key,
                                friends: user.friends
                            });

                        });

                    } else {

                        console.log("Wrong password");

                    }

                });

            } else if (cs.authcheck(data.userid, data.userkey)) {

                cs.fetchUserbyID(data.userid, function (user) {
                    
                    if(user){
                      
                        socket.emit("signedin", {
                                name: user.name,
                                id: user._id,
                                key: data.userkey,
                                friends: user.friends
                            });  
                        
                    };

                });

            }

        };


        socket.on("signin", function (data) {

            cs.checkin(data);

        });


        socket.on("upload", function (data) {

            var url = new Date().getTime();

            fs.writeFile("images/" + url + ".jpg", data, function (err) {

                gm("images/" + url + ".jpg")
                    .filter("Sinc")
                    .resize(500, 500)
                    .write("images/" + url + ".jpg", function (err) {

                        if (!err) {

                            socket.emit("uploaded", url);


                        }
                    });

            });
        })

        //Socket conection function ends

    });
};