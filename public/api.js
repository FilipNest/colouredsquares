if (!window.WebSocket) {

  console.error("Your browser needs to support websockets for this to work")

} else {

  var cs = function (options) {

    var connect = function (options) {

      var websocket;

      if (!options.secure) {

        websocket = new WebSocket("ws://" + options.address);

      } else {

        websocket = new WebSocket("wss://" + options.address);

      }

      var colour = options.colour.join("-");

      websocket.onopen = function () {

        var message = {
          type: "pair",
          squarefield: colour
        };
        websocket.send(JSON.stringify(message));

      }

      websocket.onclose = function (close) {

        setTimeout(function () {
          connect(options);
        }, 2000);

      };

      websocket.onmessage = function (evt) {

        var message;

        try {

          message = JSON.parse(evt.data);

        } catch (e) {

          console.log(e);

        }

        if (message) {

          if (message.type === "squares") {

            if (options.callback && typeof options.callback === "function") {

              var output = {
                squares: [],
                squarefield: [message.content.colours.red, message.content.colours.green, message.content.colours.blue]
              }

              message.content.squares.forEach(function (square) {

                delete square.contents;

                output.squares.push(square);

              })

              options.callback(output);

            }

          }

        }

      };


    }

    if (!options.colour || !Array.isArray(options.colour)) {

      console.error("You need to supply an array of red green and blue values - [256,256,256] for example.")
      return false;

    }

    if (!options.address) {

      console.error("You need to specify an address for the coloured squares server")

      return false;

    }

    connect(options);

  }

};
