//Create global object

global.cs = {};

cs.config = {
  "squarefieldSize": 16,
  "dbFile": "squarefields.db",
  "port": 3000
};

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

// Create squarefield database

var Datastore = require('nedb');
cs.squarefields = new Datastore({
  filename: cs.config.dbFile,
  autoload: true
});

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

// Query on squarefield, create or return exisiting

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

          process.emit("light", fetchedField.squares[index]);

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

// Set sliders to random colour if not set

app.use(function (req, res, next) {

  if (!req.query.redSlider) {

    var colour = randomColour();

    req.query.redSlider = colour.red;
    req.query.blueSlider = colour.blue;
    req.query.greenSlider = colour.green;

  }

  next();

});

// Client side assets

app.use(express.static('public'));

// Set default squarefield

app.use(function (req, res, next) {

  try {

    req.squareField = {
      red: parseInt(req.query.red),
      green: parseInt(req.query.green),
      blue: parseInt(req.query.blue)

    };

  } catch (e) {

    // No squarefield selected redirect to homepage

  }

  if (!req.squareField || !checkColours(req.squareField)) {

    var query = querystring.stringify(req.session.colour);

    res.redirect("/?" + query);

  } else {

    cs.fetchSquarefield(req.squareField).then(function (field) {

      req.fetchedSquarefield = field;

      next();

    }, function (fail) {

      res.status(500).send("500");

    });

  }

});

// Get home squarefield

app.use(function (req, res, next) {

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

    req.authorSquarefield = field;

    req.homeLastUpdated = field.squares[0];

    next();

  }, function (fail) {

    res.status(500).send("500");

  });

});

// URLS are of the form ?red=256&green=256&blue=256&sliderRed=200&sliderGreen=200&&sliderBlue=200&mode=paint

app.get("/", function (req, res, next) {

  var source = fs.readFileSync(__dirname + "/index.html", "utf8");

  var template = Handlebars.compile(source);

  res.send(template({
    field: req.fetchedSquarefield,
    req: req
  }));

});

var url = require('url');

app.post("/", function (req, res) {

  var newQuery = req.query;

  newQuery.mode = req.body.mode;

  if (!newQuery.mode) {

    newQuery.mode = "paint";

  }

  var currentPath = url.parse(req.url).pathname;

  var square;

  if (req.body.square) {
    square = req.fetchedSquarefield.squares[req.body.square];
  }

  if (req.body.mode === "paint") {

    newQuery.redSlider = parseInt(req.body.red);
    newQuery.blueSlider = parseInt(req.body.blue);
    newQuery.greenSlider = parseInt(req.body.green);

    if (req.body.current) {

      newQuery.red = newQuery.redSlider;
      newQuery.blue = newQuery.blueSlider;
      newQuery.green = newQuery.greenSlider;

      res.redirect(currentPath + "?" + querystring.stringify(newQuery));

      return false;

    }

    if (!req.body.square) {

      res.redirect(currentPath + "?" + querystring.stringify(newQuery));

      return false;

    }

    cs.lightSquare(req.session.colour, req.squareField, req.body.square, {
      red: parseInt(req.body.red),
      green: parseInt(req.body.green),
      blue: parseInt(req.body.blue)
    }).then(function () {

      res.redirect(currentPath + "?" + querystring.stringify(newQuery));

    }, function (fail) {

      res.redirect(currentPath + "?" + querystring.stringify(newQuery));

    });

  } else if (req.body.mode === "copy-inner") {

    if (req.body.current) {

      // Copy current squarefield

      newQuery.redSlider = req.session.colour.red;
      newQuery.blueSlider = req.session.colour.blue;
      newQuery.greenSlider = req.session.colour.green;

      res.redirect(currentPath + "?" + querystring.stringify(newQuery));

      return false;

    }

    newQuery.redSlider = parseInt(square.colour.red);
    newQuery.blueSlider = parseInt(square.colour.blue);
    newQuery.greenSlider = parseInt(square.colour.green);

    res.redirect(currentPath + "?" + querystring.stringify(newQuery));

  } else if (req.body.mode === "copy-outer") {

    if (req.body.current) {

      newQuery.redSlider = req.squareField.red;
      newQuery.blueSlider = req.squareField.blue;
      newQuery.greenSlider = req.squareField.green;

      res.redirect(currentPath + "?" + querystring.stringify(newQuery));

      return false;

    }

    newQuery.redSlider = parseInt(square.author.red);
    newQuery.blueSlider = parseInt(square.author.blue);
    newQuery.greenSlider = parseInt(square.author.green);

    res.redirect(currentPath + "?" + querystring.stringify(newQuery));

  } else {

    res.redirect(currentPath + "?" + querystring.stringify(newQuery));

  }

});

wss.on('connection', function connection(ws) {

  process.on("light", function (light) {

    try {

      ws.send(JSON.stringify(light));

    } catch (e) {

      //

    }

  });

});

server.on('request', app);

server.listen(cs.config.port);
