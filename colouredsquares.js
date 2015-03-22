var settings = require('./settings.secret');
var fs = require("fs");
var gm = require('gm');
var crypto = require('crypto');


//Connect to database and trigger ready event when done;

require('mongodb').MongoClient.connect(settings.mongo, function (err, db) {
    if (err) throw err;

    //TEMPORARY CLEARING OF DATABASE BEFORE EACH RUN

    //        db.collection('squarefields').remove(function () {
    //    
    //            db_ready(db);
    //    
    //        });

    db_ready(db);

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

    cs.makekey = function (id, callback) {

        crypto.randomBytes(48, function (ex, buf) {
            activeusers[id] = buf.toString('hex');
            callback(activeusers[id]);

        });

    };

    cs.authcheck = function (id, key) {

        if (activeusers[id] && activeusers[id] === key) {

            return true;

        } else {

            return false;

        }

    }

    cs.fields = db.collection('squarefields');


    //Create field : Options: email, password, name

    cs.CreateField = function (options, success, fail) {

        var query = [];

        if (options.name) {

            query.push({
                name: options.name
            });

        }

        if (options.email) {

            query.push({
                email: options.email
            });

        }

        query = {
            $or: query
        };

        cs.fields.findOne(query, function (err, document) {

            if (document) {

                fail(document);

            } else {

                //Get count of users

                cs.fields.count(function (err, count) {

                    if (!options.name) {

                        options.name = count;

                    }

                    //Generate squares

                    var i;

                    options.squares = [];

                    for (i = 0; i < 256; i += 1) {

                        options.squares.push({
                            number: i,
                            colour: "transparent",
                            author: null,
                            edit: 0,
                            view: 0,
                            updated: Date.now()

                        });

                    }

                    //Add friends list

                    options.friends = [];

                    cs.fields.insert(options, function (err, document) {

                        success(document);

                    });


                });



            }

        })

    }

    //Create root user

    cs.CreateField({
        name: "coloured_squares",
        email: "filip@bluejumpers.com",
        password: "rgbw"
    }, function (document) {

        console.log("Home field created");

    }, function () {

        console.log("Home field exists");

    });


    //Light up square

    cs.light = function (id, key, squarefield, square, colour, callback) {

        var auth,
            friend;

        if (cs.authcheck(id, key)) {

            auth = true;

        } else {

            auth = false;

        }

        cs.fields.findOne({
            _id: ObjectID(squarefield)
        }, function (err, field) {

            var light = function () {

                cs.fields.update({
                    _id: ObjectID(squarefield),
                    "squares.number": parseInt(square)
                }, {
                    $set: {
                        "squares.$.colour": colour,
                        "squares.$.author": id
                    }

                }, function (err, document) {

                    if (document) {

                        cs.fields.findOne({
                            _id: ObjectID(squarefield)
                        }, function (err, updated) {

                            callback(updated.squares[square]);

                        });

                    }
                })

            };

            if (field) {

                //Check auth of square

                if (auth && field.friends.indexOf(id) !== -1) {

                    friend = true;

                }

                var edit = field.squares[square].edit;

                if (edit === 0) {

                    light();

                } else if (edit === 1 && auth) {

                    light();

                } else if (edit === 2 && friend) {

                    light();

                } else if (edit === 3 && field._id == id) {

                    light();

                } else {


                    console.log("Can't light");

                }

            };

        })

    };

    /*

    WEBSOCKETS
    Server, meet client.

    */

    io.on('connection', function (socket) {

        //When user loads page, check if they are signed in

        socket.on('hello', function (data) {

            if (cs.authcheck(data.id, data.key)) {

                cs.checkin(data, function (user) {

                    socket.emit("signedin", user);

                });

            } else {

                socket.emit("guest");

            }

        });

        socket.on("signup", function (data) {

            cs.CreateField({
                name: Date.now().toString(),
                email: data.email,
                password: data.password
            }, function (document) {

                cs.checkin(data, function (user) {

                    socket.emit("signedin", user);

                });

            }, function () {

                console.log("Already exists");

            });

        });


        socket.on("load", function (data) {

            var auth;

            //Check authentication status of user

            if (cs.authcheck(data.id, data.key)) {

                auth = true;

            } else {

                auth = false;

            }

            if (!data.squarefield) {

                data.squarefield = "coloured_squares";

            }

            //Load squarefield

            cs.fields.findOne({
                name: data.squarefield
            }, function (err, squarefield) {
                if (squarefield) {

                    //Want to return name, friends, squares

                    squarefield.squares.forEach(function (square, index) {

                        //Check if square can be viewed

                        if (square.view === 1 && (!auth || data.id != squarefield._id && squarefield.friends.indexOf(data.id) === -1)) {


                            squarefield.squares[index].colour = "black";


                        }

                    })

                    //Only send needed information about field 
                    squarefield = {
                        squares: squarefield.squares,
                        _id: squarefield._id,
                        name: squarefield.name,
                        friends: squarefield.friends
                    };

                    //Find squarefield's friends

                    cs.fields.count({
                        friends: squarefield._id.toString()
                    }, function (err, count) {
                        
                        squarefield.friendcount = count;

                        socket.emit("load", squarefield);

                    });

                } else {

                    socket.emit("404", data.squarefield);

                }

            });

        });

        cs.checkin = function (data, callback) {

            //email,password,id,key

            if (data.password && data.email) {

                cs.fields.findOne({
                    email: data.email
                }, function (err, user) {

                    var currentuser;

                    if (!user) {

                        console.log("user doesn't exist");

                    } else if (user.password === data.password) {

                        //Sign in through form

                        cs.makekey(user._id, function (key) {

                            currentuser = {

                                name: user.name,
                                id: user._id,
                                key: key,
                                friends: user.friends

                            }

                            if (callback) {
                                callback(currentuser);
                            }

                        });

                    } else {

                        console.log("Wrong password");

                    }

                });

            } else if (cs.authcheck(data.id, data.key)) {

                cs.fields.findOne({
                    _id: ObjectID(data.id)
                }, function (err, user) {


                    if (user) {

                        currentuser = {
                            name: user.name,
                            id: user._id,
                            key: data.key,
                            friends: user.friends
                        };

                        if (callback) {
                            callback(currentuser);
                        }

                    };

                });

            }

        };


        socket.on("favourite", function (data) {

            if (cs.authcheck(data.id, data.key)) {

                if (data.squarefield !== data.id) {

                    cs.fields.findOne({
                        _id: ObjectID(data.id),
                        friends: data.squarefield
                    }, function (err, field) {

                        if (field) {

                            cs.fields.update({
                                _id: ObjectID(data.id)
                            }, {
                                $pull: {
                                    friends: data.squarefield
                                }

                            }, function (err, update) {

                                if (update) {

                                    socket.emit("favourite", {
                                        status: false,
                                        id: data.squarefield
                                    });

                                }

                            });

                        } else {

                            cs.fields.update({
                                _id: ObjectID(data.id)
                            }, {
                                $push: {
                                    friends: data.squarefield
                                }

                            }, function (err, update) {

                                if (update) {

                                    socket.emit("favourite", {
                                        status: true,
                                        id: data.squarefield
                                    });

                                }

                            });

                        }

                    });

                } else {

                    console.log("can't favourite your own field");

                }

            };

        });

        socket.on("signin", function (data) {

            cs.checkin(data, function (user) {

                socket.emit("signedin", user);

            });

        });

        socket.on("light", function (data) {

            cs.light(data.id, data.key, data.squarefield, data.square, data.colour, function (square) {

                square.squarefield = data.squarefield;

                io.emit('light', square);

            });

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