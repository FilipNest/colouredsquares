//Create global object

global.cs = {};

cs.config = {
  "squarefieldSize": 16,
  "dbFile": "squarefields.db",
  "port": 1616
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
    claimed: null,
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

  square.contents = '<time datetime="' + machineTime + '">' + humanTime + '</time>';
  square.contents += "<span>Colour:" + square.colour.red + "," + square.colour.green + "," + square.colour.blue + "</span><br />";
  square.contents += "<span>Author:" + square.author.red + "," + square.author.green + "," + square.author.blue + "</span>";

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

var sessionConfig = {
  secret: crypto.randomBytes(8).toString('hex'),
  resave: false,
  saveUninitialized: true,
};

var sessions = require("express-session")(sessionConfig);

app.use(sessions);

// Random anonymous session (for now)

var randomColour = function () {

  return {
    red: Math.floor(Math.random() * 256) + 1,
    green: Math.floor(Math.random() * 256) + 1,
    blue: Math.floor(Math.random() * 256) + 1
  };

};

app.use(function (req, res, next) {

  if (!req.session.colour) {

    req.session.colour = randomColour();

  }

  next();

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

// Set sliders to session colour if not set. Also set default paint mode if not set.

app.use("/:colour?", function (req, res, next) {

  if (!req.query.redSlider) {

    req.query.redSlider = req.session.colour.red;
    req.query.greenSlider = req.session.colour.green;
    req.query.blueSlider = req.session.colour.blue;

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

      res.redirect("/" + req.session.colour.red + "-" + req.session.colour.green + "-" + req.session.colour.blue + "?" + querystring.stringify(req.query));

      return false;

    }

    if (req.body.current) {

      req.query.red = req.query.redSlider;
      req.query.blue = req.query.blueSlider;
      req.query.green = req.query.greenSlider;

      res.redirect("/" + req.query.red + "-" + req.query.green + "-" + req.query.blue + "?" + querystring.stringify(req.query));

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

// Post and copy inner

app.post("/:colour?", function (req, res, next) {

  if (req.body.mode !== "copy-inner") {

    next();
    return false;

  }

  var square;

  if (req.body.square) {
    square = req.squarefieldEntity.squares[req.body.square];
  }

  if (req.body.home) {

    // Copy current squarefield

    req.query.redSlider = req.homeLastUpdated.colour.red;
    req.query.blueSlider = req.homeLastUpdated.colour.blue;
    req.query.greenSlider = req.homeLastUpdated.colour.green;

    next();

    return false;

  }

  if (req.body.current) {

    // Copy current squarefield

    req.query.redSlider = req.session.colour.red;
    req.query.blueSlider = req.session.colour.blue;
    req.query.greenSlider = req.session.colour.green;

    next();
    return false;

  }

  req.query.redSlider = parseInt(square.colour.red);
  req.query.blueSlider = parseInt(square.colour.blue);
  req.query.greenSlider = parseInt(square.colour.green);

  next();

});

// Post and copy outer

app.post("/:colour?", function (req, res, next) {

  if (req.body.mode !== "copy-outer") {

    next();
    return false;

  }

  var square;

  if (req.body.square) {
    square = req.squarefieldEntity.squares[req.body.square];
  }

  if (req.body.home) {

    // Copy current squarefield

    req.query.redSlider = req.homeLastUpdated.author.red;
    req.query.blueSlider = req.homeLastUpdated.author.blue;
    req.query.greenSlider = req.homeLastUpdated.author.green;

    next();
    return false;

  }

  if (req.body.current) {

    req.query.redSlider = req.squarefieldColour.red;
    req.query.blueSlider = req.squarefieldColour.blue;
    req.query.greenSlider = req.squarefieldColour.green;

    next();

    return false;

  }

  req.query.redSlider = parseInt(square.author.red);
  req.query.blueSlider = parseInt(square.author.blue);
  req.query.greenSlider = parseInt(square.author.green);

  next();

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

    res.redirect(currentPath + "?" + querystring.stringify(req.query));

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
