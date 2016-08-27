var subscriptions = {};
var url = require("url");

module.exports = function (server, cs) {

  var WebSocketServer = require('ws').Server;
    
  var wss = new WebSocketServer({
    server: server
  });

  var fields = cs.fields;

  cs.events.on("squareUpdated", function (data) {

    // send socket message to subscribers

    var subscribers = subscriptions[data.field.id];

    Object.keys(subscribers).forEach(function (subscriber) {

      try {

        subscribers[subscriber].send(JSON.stringify(data.square));

      } catch (e) {

        if (subscribers[subscriber].readyState === 3) {

          delete subscriptions[data.field.id][subscriber];

        }

      }

    });

  })

  // Add subscribers to all squarefields

  cs.events.on("newField", function (field) {

    subscriptions[field.id] = {};

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

          subscriptions[field][socket.id] = socket;

        }

      });

    });

  });

}
