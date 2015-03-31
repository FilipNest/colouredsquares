var settings = require('./settings.secret');
var fs = require("fs");
var gm = require('gm');
var crypto = require('crypto');


//Connect to database and trigger ready event when done;

require('mongodb').MongoClient.connect(settings.mongo, function (err, db) {
    if (err) throw err;

    //        TEMPORARY CLEARING OF DATABASE BEFORE EACH RUN
    //
    //    db.collection('squarefields').remove(function () {
    //
    //        db_ready(db);
    //
    //    });

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
                            authorname: "coloured_squares",
                            edit: 0,
                            view: 0,
                            updated: Date.now()

                        });

                    }

                    //Add friends list

                    options.friends = [];
                    options.friended = [];
                    options.newestsquare = 0;
                    options.friendcount = 0;
                    options.friendedcount = 0;
                    options.updated = Date.now();

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

    cs.light = function (socket, id, key, name, squarefield, square, colour, callback) {

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
                        "squares.$.author": id,
                        "squares.$.authorname": name,
                        "squares.$.updated": Date.now(),
                        updated: Date.now(),
                        newestsquare: parseInt(square)
                    }

                }, function (err, document) {

                    if (document) {

                        cs.fields.findOne({
                            _id: ObjectID(squarefield)
                        }, function (err, updated) {

                            callback({
                                square: updated.squares[square],
                                field: updated
                            });

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

                //Light if no access requirements

                if (edit === 0) {

                    light();

                    //Light if needed to log in to edit

                } else if (edit === 1 && auth) {

                    light();

                    //Light if friendship needed to edit

                } else if (edit === 2 && friend || edit === 2 && field._id == id) {

                    light();

                    //Light if only owner can edit

                } else if (edit === 3 && field._id == id) {

                    light();

                } else {

                    socket.emit("problem", "That square is locked. Toggle square details to see what you can edit.");

                }

            };

        })

    };

    /*

    WEBSOCKETS
    Server, meet client.

    */

    io.on('connection', function (socket) {

        socket.on("lock", function (data) {

            if (data.id === data.squarefield && cs.authcheck(data.id, data.key)) {

                cs.fields.update({
                    _id: ObjectID(data.squarefield),
                    "squares.number": parseInt(data.square)
                }, {
                    $set: {
                        "squares.$.view": data.view,
                        "squares.$.edit": data.edit,
                        "squares.$.author": data.id
                    }

                }, function (err, changed) {

                    if (changed) {

                        cs.fields.findOne({
                            _id: ObjectID(data.squarefield)
                        }, function (err, updated) {

                            console.log(updated.squares[data.square]);

                        });

                    };

                })
            }
        });

        //Request list of all squarefields

        socket.on('fieldfetcher', function (request) {

            var query = {};

            if (request && request.query) {

                var list = [];

                request.query.forEach(function (element, index) {

                    list.push(ObjectID(element));

                });

                query = {
                    _id: {
                        $in: list
                    }
                };
            }

            cs.fields.find(query).sort({updated : -1}).limit(256).toArray(function (err, data) {

                if (data) {

                    var result = [];

                    data.forEach(function (element, index) {

                        result.push({
                            name: element.name,
                            id: element._id,
                            square: element.squares[element.newestsquare],
                            friendcount: element.friendcount
                        });

                        var view = element.squares[element.newestsquare].view;

                        if (!request || !request.id) {

                            request = {};
                            request.id = "guest";
                        }
                        
                        if (view == 2 && element.friends.indexOf(request.id) == -1) {
                                                        
                            if (element._id != request.id) {
                                data[index].squares[element.newestsquare].colour = "black";
                            }
                        }

                        if (view == 3 && request.id != element._id) {

                            data[index].squares[element.newestsquare].colour = "black";

                        }

                    });

                    socket.emit("fetched", result);

                }
            });

        });

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

                socket.emit("problem", "There's already a squarefield with those details");

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
                name: data.squarefield.toLowerCase()
            }, function (err, squarefield) {
                if (squarefield) {

                    //Want to return name, friends, squares

                    squarefield.squares.forEach(function (square, index) {

                        //Check if square can be viewed

                        if (square.view == 2 && squarefield.friends.indexOf(data.id) === -1) {

                            if (data.id != squarefield._id) {

                                squarefield.squares[index].colour = "black";

                            }

                        } else if (square.view == 3 && data.id != squarefield._id) {

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

                        //Reset list of connected rooms

                        socket.rooms.forEach(function (room, index) {

                            if (room !== socket.id) {

                                socket.leave(room);

                            }

                        });

                        //Join room for specific squarefield and own squarefield

                        socket.join(data.id);
                        socket.join(squarefield._id);

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

                        callback({
                            error: true,
                            message: "User doesn't exist. Try signing up?"
                        });

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

                        callback({
                            error: true,
                            message: "Wrong password"
                        });

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
                    }, function (err, field) {

                        if (field) {

                            if (field.friends.indexOf(data.squarefield) !== -1) {

                                cs.fields.update({
                                    _id: ObjectID(data.id)
                                }, {
                                    $pull: {
                                        friends: data.squarefield
                                    },
                                    $inc: {
                                        friendcount: -1
                                    }

                                }, function (err, update) {

                                    if (update) {

                                        cs.fields.update({
                                            _id: ObjectID(data.squarefield)
                                        }, {
                                            $pull: {
                                                friended: data.id
                                            },
                                            $inc: {
                                                friendedcount: -1
                                            }

                                        }, function (err, update) {

                                            socket.emit("favourite", {
                                                status: false,
                                                id: data.squarefield
                                            });

                                            io.to(data.squarefield).emit('favourited', field.friends.length - 1);

                                        });
                                    }

                                });

                            } else {

                                cs.fields.update({
                                    _id: ObjectID(data.id)
                                }, {
                                    $push: {
                                        friends: data.squarefield
                                    },
                                    $inc: {
                                        friendcount: 1
                                    }

                                }, function (err, update) {

                                    if (update) {

                                        cs.fields.update({
                                            _id: ObjectID(data.squarefield)
                                        }, {
                                            $push: {
                                                friended: data.id
                                            },
                                            $inc: {
                                                friendedcount: 1
                                            }

                                        }, function (err, update) {

                                            socket.emit("favourite", {
                                                status: true,
                                                id: data.squarefield
                                            });

                                            io.to(data.squarefield).emit('favourited', field.friends.length + 1);

                                        });
                                    }

                                });

                            }
                        }

                    });

                } else {

                    socket.emit("problem", "You can't befriend your own squarefield");

                }

            };

        });

        socket.on("logout", function (session) {

            if (cs.authcheck(session.id, session.key)) {

                socket.rooms.forEach(function (room, index) {

                    if (room !== socket.id) {

                        socket.leave(room);

                    }

                });

            };

            socket.emit("logout");

        });

        socket.on("changename", function (data) {

            if (cs.authcheck(data.session.id, data.session.key)) {

                cs.fields.findOne({
                    name: data.newname
                }, function (err, field) {

                    if (field) {

                        socket.emit("problem", "There's already a squarefield called that");

                    } else {

                        cs.fields.update({
                                _id: ObjectID(data.session.id)
                            }, {
                                $set: {
                                    "name": data.newname.toLowerCase().split(" ").join("_"),
                                }
                            },
                            function (err, updated) {

                                socket.emit("namechanged", data.newname);

                            });

                    };

                });

            }

        });

        socket.on("signin", function (data) {

            cs.checkin(data, function (user) {

                if (user.error) {

                    socket.emit("problem", user.message);

                } else {

                    socket.emit("signedin", user);
                }
            });

        });

        socket.on("light", function (data) {

            cs.light(socket, data.id, data.key, data.username, data.squarefield, data.square, data.colour, function (updated) {

                updated.square.squarefield = updated.field._id;

                //Send to self

                socket.emit("light", updated.square);

                //Check if viewer can see the squarefield before sending

                if (updated.square.view === 2) {

                    updated.field.friends.forEach(function (element, index) {

                        io.to(element).emit("light", updated.square);

                    });

                } else if (updated.square.view === 3) {

                    //Own square, do nothing.

                } else {

                    io.to(data.squarefield).emit('light', updated.square);

                }
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