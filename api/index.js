const app = require("../app");
const express = require('express');
const path = require('path');

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'public')));
module.exports = app;