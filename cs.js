var cs = require("./cs-core");
var express = require("express");
var fs = require("fs");
var url = require("url");
var bodyParser = require("body-parser");
var session = require("express-session");
var fields = cs.fields;
var querystring = require("querystring");

var app = express(cs.server);

app.use(session({
  secret: 'coloured-squares',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false
  }
}));

app.use(function (req, res, next) {

  if (!req.session.colour) {

    req.session.colour = cs.anonSession();

  }

  next();

});

app.use(bodyParser.urlencoded({
  extended: false
}));

cs.server.on("request", app);

var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({
  server: cs.server
});

var Handlebars = require("handlebars");

// Home page

app.use(express.static('public'));

app.get('/', function (req, res) {

  var source = fs.readFileSync(__dirname + "/front.html", "utf8");

  var template = Handlebars.compile(source);

  res.send(template());

});

// Squarefield page

var ages = [1000, 2000, 3000, 4000];

app.get('/fields/:fieldName', function (req, res) {

  var id = req.params.fieldName.split("?")[0];

  // Create a field if one doesn't exist

  if (!fields[id]) {

    fields[id] = cs.createField(id);

  }

  fields[id].squares.forEach(function (squareObject, index) {

    var age = Date.now() - squareObject.date;

    var square = fields[id].squares[index];

    if (age < ages[0]) {

      square.age = "age0";

    } else if (age < ages[1]) {

      square.age = "age1";

    } else if (age < ages[2]) {

      square.age = "age2";

    } else if (age < ages[3]) {

      square.age = "age3";

    } else {

      square.age = "age4";

    }

  });

  var source = fs.readFileSync(__dirname + "/field.html", "utf8");

  var template = Handlebars.compile(source);

  res.send(template({
    field: fields[id],
    req: req,
    ages: JSON.stringify(ages)
  }));

});

app.post("/fields/:id", function (req, res) {

  req.params.id = req.params.id.split("?")[0];

  var change = {};
  var square;

  Object.keys(req.body).forEach(function (key) {

    if (key.indexOf("square") !== -1) {

      square = key.split("_")[1];

    }

  });

  cs.updateSquare(req.params.id, square, {

    colours: {
      red: parseInt(req.body.red),
      blue: parseInt(req.body.blue),
      green: parseInt(req.body.green)
    },
    author: {

      red: req.session.colour.red,
      blue: req.session.colour.blue,
      green: req.session.colour.green

    }

  });

  res.redirect(req.path + "?" + querystring.stringify(fields[req.params.id].squares[square].colours));

});

cs.events.on("squareUpdated", function (data) {

  // send socket message to subscribers

  var subscribers = data.field.subscribers;

  Object.keys(subscribers).forEach(function (subscriber) {

    try {

      subscribers[subscriber].send(JSON.stringify(data.square));

    } catch (e) {

      if (subscribers[subscriber].readyState === 3) {

        delete subscribers[subscriber];

      }

    }

  });

})

// Add subscribers to all squarefields

cs.events.on("newField", function (field) {

  field.subscribers = {};

});

// Store websocket subscribers on connection

wss.on('connection', function connection(ws) {

  ws.id = Date.now();

  var location = url.parse(ws.upgradeReq.url, true);

  // you might use location.query.access_token to authenticate or share sessions
  // or ws.upgradeReq.headers.cookie (see http://stackoverflow.com/a/16395220/151312)

  ws.on('message', function (message) {

    try {
      message = JSON.parse(message);
    } catch (e) {

      // Not valid JSON

      return false;

    }

    Object.keys(message).forEach(function (item) {

      if (item === "pair") {

        var socket = ws;
        var field = message[item];

        fields[field].subscribers[socket.id] = socket;

      }

    });

  });

});
