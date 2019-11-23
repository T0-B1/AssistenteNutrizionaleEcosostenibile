const express = require('express');
const mongoose = require('mongoose');

const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');

const path = require('path');
const config = require('./config.json');

const app = express();
app.use(morgan('combined'));
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

global.log = function log(msg) {
  if (config.debugmode) {
    console.log(msg);
  }
};

mongoose.connect('mongodb://admin:teamASW1920@ds241688.mlab.com:41688/eco-assistant', { useNewUrlParser: true, useUnifiedTopology: true });

// Get the default connection
const db = mongoose.connection;

// Bind connection to error event (to get notification of connection errors)
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// TODO insert here the require for every db schema you need
require('./src/models/userModel');
require('./src/models/productModel');
require('./src/models/mealModel');

global.appRoot = path.resolve(__dirname);

const routes = require('./src/routes/routes');

routes(app);

app.use((req, res) => {
  res.status(404).send({ url: `${req.originalUrl} not found` });
});

app.listen(config.port, () => {
  global.log('Node API server started on port '.concat(config.port));
  // console.log('Node API server started on port '.concat(config.port));
});
