// Dependencies

var eventEmitter = require("events");

var events = new eventEmitter();

var server = require('http').createServer(),
  port = 3000,
  fieldSize = 16;

// Root square

var square = function (id) {

  return {
    "colours": {
      red: 256,
      green: 256,
      blue: 256
    },
    "author": "root",
    "date": Date.now(),
    "id": id
  };

};

// Squarefield generation

var field = function (id, size) {

  var output = {
    squares: [],
    id: id
  };

  for (var i = 0; i < size; i += 1) {

    output.squares.push(new square(i));

  }

  return output;

};

// Object for storing fields

var fields = {};

// Storage of unique session colours

var sessions = {};

// Random colour helper function

var anonSession = function () {

  var red = Math.floor(Math.random() * 256) + 1;
  var green = Math.floor(Math.random() * 256) + 1;
  var blue = Math.floor(Math.random() * 256) + 1;

  if (sessions[red + "_" + green + "_" + blue]) {

    return anonSession();

  } else {

    sessions[red + "_" + green + "_" + blue] = "anonymous";

    return {
      "red": red,
      "green": green,
      "blue": blue
    };

  }

};

var makeToken = function (rgb, secret) {

  if (sessions[rgb.red + "_" + rgb.green + "_" + rgb.blue]) {

    return false;

  } else {

    sessions[rgb.red + "_" + rgb.green + "_" + rgb.blue] = secret;

  }

};

var checkToken = function (rgb, secret) {

  if (sessions[rgb.red + "_" + rgb.green + "_" + rgb.blue] && sessions[rgb.red + "_" + rgb.green + "_" + rgb.blue] === secret) {

    return true;

  } else {

    return false;

  }

};

var createField = function (id) {
  
  var created = new field(id, fieldSize);
  
  events.emit("newField", created);

  return created;

};

var updateSquare = function (field, id, info) {

  // Create a squarefield if none exists

  if (!fields[field]) {

    createField(field);

  }

  fields[field].squares[id] = info;

  // Must set ID and date

  fields[field].squares[id].date = Date.now();
  fields[field].squares[id].id = id;

  return fields[field].squares[id];

};

server.listen(port);

module.exports = {

  server: server,
  checkToken: checkToken,
  makeToken: makeToken,
  updateSquare: updateSquare,
  fields: fields,
  createField: createField,
  anonSession: anonSession,
  events: events

};
