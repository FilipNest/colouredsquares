//Create global object

global.cs = {};

cs.config = {
  "squarefieldSize": 16,
  "dbFile": "squarefields.db",
  "port": 1616,
  "sessionHours": 1,
  "secret": "colouredsquares"
};

// Function for checking colour objects are valid

var checkColours = function (colourObject) {

  if (typeof colourObject !== "object") {

    return false;

  }

  var check = function (property) {

    if (typeof property === "number" && property <= 256 && property >= 0) {

      return true;

    } else {

      return false;

    }

  };

  if (check(colourObject.red) && check(colourObject.green) && check(colourObject.blue)) {

    return true;

  } else {

    return false;

  }

};

// Create square generator

var square = function (id, author = {
  red: 256,
  green: 256,
  blue: 256
}) {

  return {
    "id": id,
    "author": author,
    "colour": {
      "red": 256,
      "green": 256,
      "blue": 256
    },
    "date": Date.now()
  };

};

// Create squarefield generator

var key = function () {

  crypto.randomBytes(8).toString('hex');

};

var squarefield = function (colours) {

  if (!checkColours(colours)) {

    return false;

  }

  var squares = [];

  for (var i = 1; i <= cs.config.squarefieldSize; i += 1) {

    squares.push(new square(i));

  }

  return {

    colours: {
      red: colours.red,
      green: colours.green,
      blue: colours.blue
    },
    squares: squares,
    key: new key(),
    updated: Date.now()

  };

};

// Create squarefield database

var Datastore = require('nedb');
cs.squarefields = new Datastore({
  filename: cs.config.dbFile,
  autoload: true
});

// Query on squarefield, create new or return exisiting

// Function for transforming the field for viewing

var formatSquare = function (square) {

  var date = new Date(square.date);

  var machineTime = date.toISOString();
  var humanTime = date.getUTCDate() + "/" + date.getUTCMonth() + "/" + date.getUTCFullYear() + " @ " + date.getUTCHours() + ":" + date.getUTCMinutes() + ":" + date.getUTCSeconds() + " UTC";

  square.contents = '<time class="visually-hidden" datetime="' + machineTime + '">' + humanTime + '</time>';
  square.contents += "<span class='visually-hidden'>Colour:" + square.colour.red + "," + square.colour.green + "," + square.colour.blue + "</span><br />";
  square.contents += "<span class='visually-hidden'>Author:" + square.author.red + "," + square.author.green + "," + square.author.blue + "</span>";

  return square;

};

var formatField = function (field) {

  field.squares.forEach(function (square) {

    square = formatSquare(square);

  });

  return field;

};

cs.fetchSquarefield = function (colours) {

  return new Promise(function (resolve, reject) {

    if (!checkColours(colours)) {

      reject();
      return false;
    }

    cs.squarefields.find({
      colours: colours
    }, function (err, fields) {

      if (!fields.length) {

        // Create field

        var field = new squarefield(colours);

        cs.squarefields.insert(field, function (err, newField) {

          resolve(newField);

        });

      } else {

        resolve(fields[0]);

      }

    });

  });

};

// Light square in field

cs.lightSquare = function (author, squarefieldColours, index, squareColours) {

  return new Promise(function (resolve, reject) {

    // Check index number is valid

    if (!(typeof index === "number" && index >= 0 && index <= cs.config.squarefieldSize)) {

      reject();

    }

    if (checkColours(squarefieldColours) && checkColours(squareColours) && checkColours(author)) {

      // Fetch squarefield

      cs.fetchSquarefield(squarefieldColours).then(function (field) {

        var fetchedField = field;
        var id = field._id;

        delete field._id;

        // Find square and update it

        fetchedField.squares[index].colour = squareColours;
        fetchedField.squares[index].date = Date.now();
        fetchedField.squares[index].author = author;

        cs.squarefields.update({
          _id: id
        }, fetchedField, {}, function (err, updated) {

          var connectionString = field.colours.red + "-" + field.colours.green + "-" + field.colours.blue;
          var homeString = squarefieldColours.red + "-" + squarefieldColours.green + "-" + squarefieldColours.blue;
          var square = formatSquare(fetchedField.squares[index]);

          // Send websocket message

          if (cs.connections[connectionString]) {

            cs.connections[connectionString].forEach(function (socket) {

              // Format time and date

              var date = new Date(square.date);

              var message = {
                type: "square",
                content: square
              };

              socket.send(JSON.stringify(message));

            });

            if (cs.homeConnections[homeString]) {

              cs.homeConnections[homeString].forEach(function (socket) {

                var homeMessage = {
                  type: "home",
                  content: square
                };

                socket.send(JSON.stringify(homeMessage));

              });

            }

          }

          resolve(updated);

        });

      });

    } else {

      // Colours not valid

      reject();

    }


  });

};

// Server

var server = require('http').createServer(),
  url = require('url'),
  WebSocketServer = require('ws').Server,
  wss = new WebSocketServer({
    server: server
  }),
  express = require('express'),
  app = express(),
  fs = require("fs"),
  bodyParser = require("body-parser"),
  session = require("express-session"),
  querystring = require("querystring"),
  Handlebars = require("handlebars"),
  compression = require('compression');

cs.connections = {};
cs.homeConnections = {};

app.use(compression());

// Equality Handlebars helper

Handlebars.registerHelper('ifCond', function (v1, v2, options) {
  if (v1 === v2) {
    return options.fn(this);
  }
  return options.inverse(this);
});

app.use(bodyParser.urlencoded({
  extended: false
}));

var crypto = require("crypto");

var NedbStore = require('nedb-session-store')(session);

var sessionConfig = {
  secret: cs.config.secret,
  resave: false,
  saveUninitialized: true,
  store: new NedbStore({
    filename: "sessions.db"
  }),
  cookie: {
    maxAge: 3600000 * cs.config.sessionHours
  },
  rolling: true
};

cs.sessionStore = sessionConfig.store;

var sessions = session(sessionConfig);

app.use(sessions);

// Function for checking if session colour exists (for allowing switching)

var exists = function (colour) {

  return new Promise(function (resolve, reject) {

    var exists;

    cs.sessionStore.all(function (err, output) {

      output.forEach(function (session) {

        if (session.colour) {

          if (session.colour.red === colour.red && session.colour.blue === colour.blue && session.colour.green === colour.green) {

            exists = true;

          }
        }

      });

      if (exists) {

        resolve(true);

      } else {

        resolve(false);

      }

    });

  });

};

var randomColour = function () {

  return new Promise(function (resolve, reject) {

    var check = function () {

      var colour = {
        red: Math.floor(Math.random() * 256) + 1,
        green: Math.floor(Math.random() * 256) + 1,
        blue: Math.floor(Math.random() * 256) + 1
      };

      var exists;

      cs.sessionStore.all(function (err, output) {

        output.forEach(function (session) {

          if (session.red === colour.red && session.blue === colour.blue && session.green === colour.green) {

            exists = true;

          }

        });

      });

      if (!exists) {

        resolve(colour);

      } else {

        return check();

      }

    };

    check();

  });

};

// Check all current sessions and assign one if no session

app.use(function (req, res, next) {

  if (!req.session.colour) {

    randomColour().then(function (colour) {

      req.session.colour = colour;

      next();

    });

  } else {

    next();

  }

});

// Add timestamp to session

app.use(function (req, res, next) {

  req.session.timestamp = Date.now();

  next();

});

// Send latest active users

app.use(function (req, res, next) {

  cs.sessionStore.all(function (err, sessions) {

    sessions.sort(function (a, b) {

      if (a.timestamp < b.timestamp) {

        return 1;

      } else if (a.timestamp > b.timestamp) {

        return -1;

      } else {

        return 0;

      }

    });

    req.activeSessions = [];

    for (var i = 0; i < 16; i += 1) {

      if (sessions[i] && sessions[i].colour && sessions[i].colour.red !== req.session.colour.red && sessions[i].colour.blue !== req.session.colour.blue && sessions[i].colour.green !== req.session.colour.green) {

        req.activeSessions.push(sessions[i].colour);

      }

    }

    next();

  });

});

// Client side assets

app.use(express.static('public'));

// Function for getting squarefield colours from string

var colourFromString = function (colour) {

  colour = colour.split("-");

  if (colour.length !== 3) {

    return false;

  } else {

    colour = {
      red: parseInt(colour[0]),
      green: parseInt(colour[1]),
      blue: parseInt(colour[2])
    };

    if (checkColours(colour)) {

      return colour;

    } else {

      return false;

    }

  }

};

var stringFromColour = function (colour) {

  return colour.red + "-" + colour.green + "-" + colour.blue;

};

// Fetch squarefield ready for use

app.use("/:colour?", function (req, res, next) {

  // Split colour into components and check if valid

  var colour;

  if (!req.params.colour) {

    colour = req.session.colour;

  } else {

    colour = colourFromString(req.params.colour);

  }

  if (!colour) {

    res.status(400).send("Bad request");

  }

  // Set squarefieldColour and squarefieldEntity

  req.squarefieldColour = colour;

  cs.fetchSquarefield(colour).then(function (fetchedField) {

    req.squarefieldEntity = fetchedField;

    next();

  }, function (fail) {

    res.status(400).send("Bad request");

  });

});

// Check if squarefield has been claimed

app.use("/:colour?", function (req, res, next) {

  exists(req.squarefieldColour).then(function (claimed) {

    if (req.squarefieldColour.red !== req.session.colour.red && req.squarefieldColour.blue !== req.session.colour.blue && req.squarefieldColour.green !== req.session.colour.green) {

      req.claimed = claimed;

    } else {

      req.claimed = true;

    }

    next();

  });

});

// Set sliders to session colour if not set. Also set default paint mode if not set.

app.use("/:colour?", function (req, res, next) {

  if (!req.query.redSlider && !req.body.redSlider) {

    req.query.redSlider = req.session.colour.red;
    req.query.greenSlider = req.session.colour.green;
    req.query.blueSlider = req.session.colour.blue;

  }

  if (!req.query.redMemory1) {

    req.query.redMemory1 = 256;
    req.query.redMemory2 = 256;
    req.query.greenMemory1 = 256;
    req.query.greenMemory2 = 256;
    req.query.blueMemory1 = 256;
    req.query.blueMemory2 = 256;

  }

  if (!req.query.mode) {

    req.query.mode = "paint";

  }

  next();

});

// Get home squarefield and detect if home

app.use("/:colour?", function (req, res, next) {

  if (req.session.colour.red === req.squarefieldColour.red && req.session.colour.green === req.squarefieldColour.green && req.session.colour.blue === req.squarefieldColour.blue) {

    req.isHome = true;

  }

  cs.fetchSquarefield(req.session.colour).then(function (field) {

    // Last updated square

    field.squares.sort(function (a, b) {

      if (a.date < b.date) {

        return +1;

      } else if (a.date > b.date) {

        return -1;

      } else {

        return 0;

      }

    });

    req.homeSquarefield = field;

    req.homeLastUpdated = field.squares[0];

    next();

  }, function (fail) {

    res.status(500).send("500");

  });

});

// Getting squarefield

app.get("/:colour?", function (req, res) {

  var source = fs.readFileSync(__dirname + "/index.html", "utf8");

  var template = Handlebars.compile(source);

  if (req.query.format && req.query.format.toUpperCase() === "JSON") {

    res.json(req.squarefieldEntity);

  } else {

    var minify = require('html-minifier').minify;

    var output = template({
      field: formatField(req.squarefieldEntity),
      req: req
    });

    var minified = minify(output, {
      "caseSensitive": false,
      "collapseBooleanAttributes": true,
      "collapseInlineTagWhitespace": false,
      "collapseWhitespace": true,
      "conservativeCollapse": false,
      "html5": true,
      "decodeEntities": true,
      "includeAutoGeneratedTags": false,
      "keepClosingSlash": false,
      "maxLineLength": 0,
      "minifyCSS": true,
      "minifyJS": true,
      "preserveLineBreaks": false,
      "preventAttributesEscaping": false,
      "removeAttributeQuotes": true,
      "removeComments": true,
      "removeEmptyAttributes": true,
      "removeRedundantAttributes": true,
      "removeTagWhitespace": true,
      "sortAttributes": true,
      "sortClassName": true,
      "removeOptionalTags": true,
      "trimCustomFragments": true,
      "useShortDoctype": true
    });

    res.send(minified);

  }

});

// Post and paint

app.post("/:colour?", function (req, res, next) {

  if (req.body.mode !== "paint" && req.body.mode) {

    next();
    return false;

  } else {

    req.query.redSlider = parseInt(req.body.red);
    req.query.blueSlider = parseInt(req.body.blue);
    req.query.greenSlider = parseInt(req.body.green);

    if (req.body.home) {

      // Was going to be light up square on home squarefield. Instead, make travel home.

      res.redirect("/" + req.session.colour.red + "-" + req.session.colour.green + "-" + req.session.colour.blue + "?" + querystring.stringify(req.query) + "#top");

      return false;

    }

    if (req.body.current) {

      req.query.red = req.query.redSlider;
      req.query.blue = req.query.blueSlider;
      req.query.green = req.query.greenSlider;

      res.redirect("/" + req.query.red + "-" + req.query.green + "-" + req.query.blue + "?" + querystring.stringify(req.query) + "#top");

      return false;

    }

    cs.lightSquare(req.session.colour, req.squarefieldColour, req.body.square, {
      red: parseInt(req.body.red),
      green: parseInt(req.body.green),
      blue: parseInt(req.body.blue)
    }).then(function () {

      next();

    }, function (fail) {

      next();

    });

  }

});

// Post and copy

app.post("/:colour?", function (req, res, next) {

  if (req.body.mode !== "copy") {

    next();
    return false;

  }

  var copy = function (colour1, colour2) {

    req.query.redMemory1 = colour1.red;
    req.query.redMemory2 = colour2.red;
    req.query.greenMemory1 = colour1.green;
    req.query.greenMemory2 = colour2.green;
    req.query.blueMemory1 = colour1.blue;
    req.query.blueMemory2 = colour2.blue;

  };

  if (req.body.square) {

    var square = req.squarefieldEntity.squares[req.body.square];

    copy(square.colour, square.author);

    next();

    return false;

  }

  if (req.body.home) {

    copy(req.homeLastUpdated.colour, req.homeLastUpdated.author);

    next();

    return false;

  }

  if (req.body.this) {

    copy(req.session.colour, req.squarefieldColour);

    next();

    return false;

  }

  next();

});

app.post("/:colour?", function (req, res, next) {

  if (!req.body.memory) {

    next();
    return false;

  }

  var memory = req.body.memory;

  req.query.redSlider = req.query["redMemory" + memory];
  req.query.greenSlider = req.query["greenMemory" + memory];
  req.query.blueSlider = req.query["blueMemory" + memory];

  next();

});

app.post("/:colour?", function (req, res, next) {

  if (!req.body.claim) {

    next();
    return false;

  }

  exists(req.squarefieldColour).then(function (taken) {

    if (!taken) {

      req.session.colour = req.squarefieldColour;

    }

    next();

  });

});

// Final post function tidy up (not called when travelling)

app.post("/:colour?", function (req, res) {

  // Check if posted from the api

  if (!req.body.mode) {

    res.json("success");

  } else {

    // Always make the mode paint after post

    req.query.mode = "paint";

    var url = require('url');

    var currentPath = url.parse(req.url).pathname;

    res.redirect(currentPath + "?" + querystring.stringify(req.query) + "#top");

  }

});

// 404 catching

app.use(function (req, res) {

  res.status(404).send("404");

});

wss.on('connection', function connection(ws) {

  ws.on("message", function (message) {

    try {

      message = JSON.parse(message);

      if (message.type === "pair") {

        if (!cs.connections[message.squarefield]) {

          cs.connections[message.squarefield] = [];

        }

        cs.connections[message.squarefield].push(ws);

        ws.subscribed = message.squarefield;

      } else if (message.type === "homePair") {

        if (!cs.homeConnections[message.squarefield]) {

          cs.homeConnections[message.squarefield] = [];

        }

        cs.homeConnections[message.squarefield].push(ws);

        ws.home = message.squarefield;

      }

    } catch (e) {

      console.log(e);

    }

  });

  ws.on("close", function () {

    try {

      cs.connections[ws.subscribed].forEach(function (socket, index) {

        if (socket === ws) {

          delete cs.connections[ws.subscribed][index];

        }

      });

    } catch (e) {

      // Not stored

    }

    try {

      cs.homeConnections[ws.home].forEach(function (socket, index) {

        if (socket === ws) {

          delete cs.homeConnections[ws.home][index];

        }

      });

    } catch (e) {

      // Not stored

    }

  });

});

server.on('request', app);

server.listen(cs.config.port);
