**Note: There is a pull request (https://github.com/FilipNest/colouredsquares/pull/1) that fixes a possible server bug if JS is enabled, the websocket connection is supported, works and then fails. This is not merged in as it was sadly made 8 hours after the A List Apart 10k competition deadline. It'll be merged in at a later date.**

A hopefully working version of the app is available at http://10k.colouredsquares.com

# Coloured squares

Coloured Squares is a social network, art project and web-based controller. This version was created from scratch for the [A List Apart 10kb challenge](https://a-k-apart.com/).

It is made up of 16 million or so squarefields, each asigned a colour (3 values from 0-256 for red, green and blue). Every user is also assigned a colour and thereby a squarefield. They can hop to another squarefield and change to its colour if it hasn't been claimed (claim sessions last about an hour). Each squarefield has 16 squares. These can be lit up in any of the 16 million colours and also get a stamp saying who lit it up (colour) and when (a slowly disolving border). Buttons can be used to copy square and author colours, transport to new squarefields and go home/view home notifications of who's been lighting up your home squarefield and how.

It is built using one big HTML form and a node.js server on the server side so should work without JavaScript. It uses client side JavaScript websockets (where available) to send live updates. There is not much text on the front end but if you use a text browser everything is labeled. You don't even need to see the colours as colours. They're simply IDs of 3 numbers.

Using a simple API (add `format=JSON` to the query string) or POST square information (`?square=1&red=200&blue=100&green=50`) to use the squares for storing or reading any sort of information. A sequencer/synthesizer is an obvious one, encrypted text, images with IDs corresponding to squares... Lots.

The main point is you should have fun with it and do whatever you want.
