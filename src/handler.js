import BitmovinTransmuxingLambda from './BitmovinTransmuxingLambda';

'use strict';
require('dotenv').config();
const jf = require('jsonfile');

function entry(event, context, callback) {
  const bit = new BitmovinTransmuxingLambda();
  console.log('Starting new bitmovin transmuxing job');
  bit.createTransmuxes();
  callback(null, 'Success!');
}

function test() {
  const bit = new BitmovinTransmuxingLambda();
  console.log('Starting new bitmovin transmuxing job');
  bit.createTransmuxes();
  callback(null, 'Success!');
}

module.exports = {
  entry,
  test,
};
