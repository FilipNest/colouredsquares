var settings = require('./settings.secret');
var fs = require("fs");
var gm = require('gm');
var crypto = require('crypto');


//Connect to database and trigger ready event when done;

require('mongodb').MongoClient.connect(settings.mongo, function (err, db) {
    if (err) throw err;

    //TEMPORARY CLEARING OF DATABASE BEFORE EACH RUN

    db.collection('squarefields').remove(function () {

        db_ready(db);

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

    cs.fields = db.collection('squarefields');


    //Create field : Options: email, password, name

    cs.CreateField = function (options, success, fail) {

        var query = {};

        if (options.name) {

            query.name = options.name;

        }
        if (options.email) {

            query.email = options.email;

        }

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
                            access: 3,
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
        name: "Coloured Squares",
        email: "filip@bluejumpers.com",
        password: "rgbw"
    }, function (document) {

        console.log("Home field created");

    }, function () {

        console.log("Home field exists");

    });


    //Light up square

    cs.light = function (userid, key, squarefield, square, colour, callback) {

        var auth,
            friend;

        if (cs.authcheck(userid, key)) {

            auth = true;

        }

        cs.fields.findOne({
            name: squarefield
        }, function (err, field) {

            var light = function () {

                cs.fields.update({
                    name: squarefield,
                    "squares.number": square
                }, {
                    $set: {
                        "squares.$.colour": colour,
                        "squares.$.author": userid
                    }

                }, function (err, document) {

                    if (document) {

                        cs.fields.findOne({
                            name: squarefield
                        }, function (err, field) {

                            callback(field.squares[5]);

                        });

                    }
                })

            };

            if (field) {

                //Check auth of square

                if (auth && field.friends.indexOf(userid) !== -1) {

                    friend = true;


                }

                var access = field.squares[square].access;

                light();

            };

        })

    };


    setTimeout(function () {

        cs.light(null, null, "Coloured Squares", 5, "red", function (square) {



        });
    }, 500);

    /*

    WEBSOCKETS
    Server, meet client.

    */

    io.on('connection', function (socket) {

        //When user loads page, check if they are signed in

        socket.on('hello', function (data) {

            if (cs.authcheck(data.userid, data.userkey)) {

                cs.checkin(data, function (user) {

                    socket.emit("signedin", user);

                });

            } else {

                socket.emit("guest");

            }

        });


        socket.on("load", function (data) {

            var auth;

            //Check authentication status of user

            if (cs.authcheck(data.userid, data.userkey)) {

                auth = true;

            } else {

                auth = false;

            }
            
            
            if (!data.squarefield) {

                data.squarefield = "Coloured Squares";

            }

            //Load squarefield

            cs.fields.findOne({
                name: data.squarefield
            }, function (err, squarefield) {
                if (squarefield) {

                    //Want to return name, friends, squares

                    squarefield.squares.forEach(function (square, index) {
                        
                        //Check if square can be viewed
                        
                        if(square.access === 3 && (!auth || squarefield.friends.indexOf(data.userid) === -1)){
                            
                            squarefield.squares[index].colour = "black";
                            
                        }

                    })
                    
                    socket.emit("load", squarefield);

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

            } else if (cs.authcheck(data.userid, data.userkey)) {

                cs.fields.findOne({
                    _id: ObjectID(data.userid)
                }, function (err, user) {


                    if (user) {

                        currentuser = {
                            name: user.name,
                            id: user._id,
                            key: data.userkey,
                            friends: user.friends
                        };

                        if (callback) {
                            callback(currentuser);
                        }

                    };

                });

            }

        };


        socket.on("signin", function (data) {

            cs.checkin(data, function (user) {

                socket.emit("signedin", user);

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