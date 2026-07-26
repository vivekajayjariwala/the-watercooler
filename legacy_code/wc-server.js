// server.js
const express = require('express');
var path = require('path');
var serveStatic = require('serve-static');
const app = express();
app.use(serveStatic(__dirname + "/wcFrontend"))
const PORT = 4321;
// //

app.listen(PORT, () => console.log(`Server listening in port ${PORT}`))