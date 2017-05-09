import BitmovinTransmuxingLambda from './BitmovinTransmuxingLambda';

'use strict';
require('dotenv').config();
const jf = require('jsonfile');

const successMessage = (res) => {
  console.log('Successfully created and transfered transmuxings', res);
  let message = {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json"
    },
    body: "Success, " + JSON.stringify(res)
  }
  console.log("Success message: ", message);
  return message;
}

const errorMessage = (error) => {
  console.log("ERROR failed to create/transfer transmuxing to S3", error);
  let message = {
    statusCode: 500,
    headers: {
      "Content-Type": "application/json"
    },
    body: "Error, " + JSON.stringify(error)
  }
  console.log("Error message: ", message);
  return message;
}

function processMessage(event) {
  let message = event.body;
  message = JSON.parse(message);
  return message;
}

function entry(event, context, callback) {
  const bit = new BitmovinTransmuxingLambda();
  console.log('Starting new bitmovin transmuxing job');
  const message = processMessage(event);
  bit.start(message)
    .then((res) => {
      callback(null, successMessage(res));
    })
    .catch((error) => {
      callback(null, errorMessage(error));
    }
  );
}

function test() {
  const bit = new BitmovinTransmuxingLambda();
  console.log('Starting new bitmovin transmuxing job');
  const event = jf.readFileSync('event.json');
  const message = processMessage(event);
  bit.start(message)
    .then((res) => {
      successMessage(res);
    })
    .catch((error) =>{
      errorMessage(error);
    }
  );
}

module.exports = {
  entry,
  test,
};
