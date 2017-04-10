import BitmovinTranscodeLambda from './BitmovinTranscodeLambda';

'use strict';
require('dotenv').config();
const jf = require('jsonfile');

function processSNS(event) {
  const message = event.Records[0].Sns.Message;
  return message;
}

function entry(event, context, callback) {
  const bit = new BitmovinTranscodeLambda();
  console.log('Starting new bitmovin transcode job');
  const message = processSNS(event);
  bit.getVideoLink(message);
  callback(null, 'Success!');
}

function test() {
  const bit = new BitmovinTranscodeLambda();
  console.log('Starting TEST bitmovin transcode');
  const event = jf.readFileSync('event.json');
  const message = processSNS(event);
  bit.getVideoLink(message);
}

module.exports = {
  entry,
  test,
};
