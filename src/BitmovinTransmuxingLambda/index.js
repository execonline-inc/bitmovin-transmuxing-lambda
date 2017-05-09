const videoStreamIndex = (quality) => {
  switch (quality) {
    case 'mobile.mp4': return 5;
    case 'medium.mp4': return 0;
    case 'high.mp4': return 1;
  }
} 

const getRepresentationId = (quality, videoStreamConfigs) => {
  const idx = videoStreamIndex(quality);
  const config = videoStreamConfigs[idx];
  if (config) return config.representationId;
}

const createOutput = (message, bitcodin, outputPath) => {

  let outputParams = {
    "type": "s3",
    "name": process.env.ENVIRONMENT + "/" + outputPath,
    "region": "us-east-1",
    "accessKey": process.env.AWS_KEY,
    "secretKey": process.env.AWS_SECRECY_KEY,
    "bucket": process.env.AWS_S3_BUCKET,
    "prefix": "bitmovin/" + outputPath,
    "makePublic": true
  };
  return bitcodin.output.s3.create(outputParams)
}

const listOutput = (message, bitcodin, outputPath) => {
  const jobId = message.payload.jobId;
  return bitcodin.output.list(0, 'finished')
}

const getJobDetails = (bitcodin, jobId) => {
  return bitcodin.job.getDetails(jobId);
}

const createTransmux = quality => (bitcodin, outputPath, jobId, outputId, res) => {

  let transmuxConfiguration = {
      "outputId": outputId
    };
  transmuxConfiguration.filename = quality + ".mp4"

  let videoStreamConfigs = res.encodingProfiles[0].videoStreamConfigs;
  let audioStreamConfigs = res.encodingProfiles[0].audioStreamConfigs;
  transmuxConfiguration.jobId = res.jobId;

  let audioRepresentationIds = [];
  if(audioStreamConfigs.length > 0) {
    for (var i = 0, len = audioStreamConfigs.length; i < len; i++) {
      audioRepresentationIds.push(audioStreamConfigs[i].representationId);
    }
    transmuxConfiguration.audioRepresentationIds = audioRepresentationIds;
  }

  if(videoStreamConfigs.length > 0) {
    transmuxConfiguration.videoRepresentationId = getRepresentationId(
                                                    transmuxConfiguration.filename,
                                                    videoStreamConfigs);
  }

  return bitcodin.transmux.create(transmuxConfiguration);
}

const createLowTransmux = createTransmux("mobile");

const createMediumTransmux = createTransmux("medium");

const createHighTransmux = createTransmux("high");

class BitmovinTransmuxingLambda {
  start = (message) => {
    const bitcodin = require('bitcodin')(process.env.BITMOVIN_API_TOKEN);
    const outputPath = message.payload.outputUrl.match(/[0-9]{2,}_[A-z 0-9]+$/)[0];
    const jobId = message.payload.jobId;

    return createOutput(message, bitcodin, outputPath)
      .then((res) => {
        return Promise.all([listOutput(message, bitcodin, outputPath), getJobDetails(bitcodin, jobId)]);
      })
      .then((res) => {
        let outputId = res[0].outputs[0].outputId;
        return Promise.all([createLowTransmux(bitcodin, outputPath, jobId, outputId, res[1]),
                     createMediumTransmux(bitcodin, outputPath, jobId, outputId, res[1]),
                     createHighTransmux(bitcodin, outputPath, jobId, outputId, res[1])]);
      }
    );
  }
}

export default BitmovinTransmuxingLambda;
