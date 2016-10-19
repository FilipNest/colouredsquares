# Coloured squares

Coloured Squares is a social network, art project and web-based live multiplayer controller. This version was created from scratch for the [A List Apart 10kb challenge](https://a-k-apart.com/). Because it's fast, accessibility friendly and extendable through an API it's going to be the main one. The last version is up at colouredsquares.com for now while a version of this one is hosted at 10k.colouredsquares.com . These will eventually swap places somewhat.

Coloured Squares is made up of 16 million or so squarefields, each one is asigned a colour (3 values from 0-256 for red, green and blue). Every user that logs into the system (just by visiting, no usernames/passwords needed) is also assigned a colour and thereby a squarefield. They can hop to another squarefield and change to its colour if it hasn't been claimed (claim sessions last about an hour after the last activity of that user). 

Each squarefield has 16 squares. These can be lit up in any of the 16 million colours and also get a stamp saying who lit it up (colour) and when (a slowly disolving border). Buttons can be used to copy square and author colours, transport to new squarefields and go home/view home notifications of who's been lighting up your home squarefield and how.

## How do I use it?

### Live on the site

If you head over to a server it's hosted on (coloured-squares-10kapart2016.azurewebsites.net for example) you can light squares, change your colour and explore and light up colours on any of the 16 million squarefields.

As each colour is an id of 3 numbers from 0-255, a square can be used to send a lot of information of various types. Coloured Squares comes with an API for this purpose.

### REST API

Add `format=JSON` to the query string of a squarefield address to get a JSON feed of the current state of the squarefield. For example:

`http://coloured-squares-10kapart2016.azurewebsites.net/120-252-133?format=json`

You can also POST to light up a squarefield by sending something like:

`?square=1&red=200&blue=100&green=50` to a squarefield url.

### Websocket API helper (listening to live updates)

Coloured Squares comes with a little API helper file, `api.js` which you can use to listen to updates to a squarefield and respond to them. Currently it's very basic but is used in the following way:

```HTML

  <script src="http://10k.colouredsquares.com/api.js"></script>
 
  <script>
    cs({
      address: "coloured-squares-10kapart2016.azurewebsites.net",
      secure: true,
      colour: [100, 200, 100],
      callback: function(update) {

        console.log(update);

      }
    })
    
  </script>
    
```

Load in the `api.js` file, pass in an options object to the `cs` function. This has to include the following:

* address - the address the coloured squares instance is hosted on (don't put in HTTP or HTTPS).
* secure - is the site hosted on http or https?
* colour - an array of three numbers for the red, green and blue of the field you want to connect to.
* Callback - A callback function when a square is updated. Contains the updated squarefield information in a "squares" array of all the squares in the field and their colours, authors and timestamps.

