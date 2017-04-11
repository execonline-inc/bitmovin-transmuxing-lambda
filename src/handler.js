import BitmovinTransmuxingLambda from './BitmovinTransmuxingLambda';

'use strict';
require('dotenv').config();
const jf = require('jsonfile');

function processMessage(event) {
  const message = event.body
  return message;
}

function entry(event, context, callback) {
  const bit = new BitmovinTransmuxingLambda();
  console.log('Starting new bitmovin transmuxing job');
  const message = processMessage(event);
  bit.createTransmuxes(message);
  callback(null, 'Success!');
}

function test() {
  const bit = new BitmovinTransmuxingLambda();
  console.log('Starting new bitmovin transmuxing job');
  const event = jf.readFileSync('event.json');
  const message = processMessage(event);
  bit.createTransmuxes(message);
}

module.exports = {
  entry,
  test,
};
