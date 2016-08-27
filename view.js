var cs = require("./cs");

var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({
  server: cs.server
});

var Handlebars = require("handlebars");


// Home page

cs.app.use(express.static('public'));

// Ages

var ages = [1000, 2000, 3000, 4000];

cs.app.get('/', function (req, res) {

  var source = fs.readFileSync(__dirname + "/front.html", "utf8");

  var template = Handlebars.compile(source);

  res.send(template());

});


// Squarefield page

cs.app.get('/fields/:fieldName', function (req, res) {

  var id = req.params.fieldName.split("?")[0];

  if (!fields[id]) {

    fields[id] = new field(id, fieldSize);

  }

  fields[id].squares.forEach(function (square, index) {

    var age = Date.now() - square.date;

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

  })

  var source = fs.readFileSync(__dirname + "/field.html", "utf8");

  var template = Handlebars.compile(source);

  res.send(template({
    field: fields[id],
    req: req,
    ages: JSON.stringify(ages)
  }));

});

cs.app.post("/fields/:id", function (req, res) {

  req.params.id = req.params.id.split("?")[0];

  var change = {};
  var square;

  Object.keys(req.body).forEach(function (key) {

    if (key.indexOf("square") !== -1) {

      square = key.split("_")[1];

    }

  })

  if (!fields[req.params.id]) {

    fields[req.params.id] = new field(req.params.id, fieldSize);

  }

  fields[req.params.id].squares[square].colours = {

    red: parseInt(req.body.red),
    blue: parseInt(req.body.blue),
    green: parseInt(req.body.green)

  };

  fields[req.params.id].squares[square].author = {

    red: req.session.colour.red,
    blue: req.session.colour.blue,
    green: req.session.colour.green

  };

  fields[req.params.id].squares[square].date = Date.now()

  // send socket message to subscribers

  var subscribers = fields[req.params.id].subscribers;

  Object.keys(subscribers).forEach(function (subscriber) {

    try {

      subscribers[subscriber].send(JSON.stringify(fields[req.params.id].squares[square]));

    } catch (e) {

      if (subscribers[subscriber].readyState === 3) {

        delete subscribers[subscriber];

      }

    }

  })

  res.redirect(req.path + "?" + querystring.stringify(fields[req.params.id].squares[square].colours));

})

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

    })

  });

});
