require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

const isDev = process.env.NODE_ENV !== 'production';
const PORT = process.env.PORT || 5001;


const server = require("./routes/cal");

const app = express();

var cors = require('cors'); 
app.use(cors());

//for accepting json in body
app.use(bodyParser.json());

app.use(`/api`, server);


app.listen(PORT, function () {
console.error(`Node ${isDev ? 'dev server' : 'cluster worker '+process.pid}: listening on port ${PORT}`);
});

