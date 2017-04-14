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

const createOutput = (bitcodin, outputPath, jobId) => {
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

  bitcodin.output.s3.create(outputParams).then(
    (createOutputResponse) => {
      bitcodin.output.list(0, 'finished').then(
        (outputResponse) => {
          let outputId = outputResponse.outputs[0].outputId;
          createLowTransmux(bitcodin, outputPath, jobId, outputId);
          createMediumTransmux(bitcodin, outputPath, jobId, outputId);
          createHighTransmux(bitcodin, outputPath, jobId, outputId);
          },
        (outputError) => {
          console.log('Error while listing outputs', outputError);
        }
      );
    },
    (createOutputDetails) => {
      console.log('Error while creating new output', createOutputResponse);
    }
  );
}

const createTransmux = quality => (bitcodin, outputPath, jobId, outputId) => {
  let transmuxings = [];
  let transmuxDetails;

  let transmuxConfiguration = {
      "outputId": outputId
    };
  transmuxConfiguration.filename = quality + ".mp4"

  bitcodin.job.getDetails(jobId).then(
    (jobResponse) => {
      let videoStreamConfigs = jobResponse.encodingProfiles[0].videoStreamConfigs;
      let audioStreamConfigs = jobResponse.encodingProfiles[0].audioStreamConfigs;
      transmuxConfiguration.jobId = jobResponse.jobId;

      let audioRepresentationIds = [];
      if(audioStreamConfigs.length > 0) {
        for (var i = 0, len = audioStreamConfigs.length; i < len; i++) {
          audioRepresentationIds.push(audioStreamConfigs[i].representationId);
        }
        transmuxConfiguration.audioRepresentationIds = audioRepresentationIds;
      }

      if(videoStreamConfigs.length > 0) {
        transmuxConfiguration.videoRepresentationId = getRepresentationId(transmuxConfiguration.filename, videoStreamConfigs);
      }

      bitcodin.transmux.create(transmuxConfiguration).then(
        (transmuxResponse) => {
          transmuxDetails = transmuxResponse;
          transmuxings.push(transmuxResponse);
          console.log('Successfully created a new transmuxing');
        },
        (transmuxDetails) => {
          console.log('Error while creating a new transmuxing', transmuxDetails);
        }
      );
    },
    (jobError) => {
    console.log('Error while getting job details', jobError);
    }
  );    
}

const createLowTransmux = createTransmux("mobile");

const createMediumTransmux = createTransmux("medium");

const createHighTransmux = createTransmux("high");

class BitmovinTransmuxingLambda {
  createTransmuxes = (message) => {
    message = JSON.parse(message)
    const jobId = message.payload.jobId;
    const outputPath = message.payload.outputUrl.match(/[0-9]{2,}_[A-z 0-9]+$/)[0];
    const bitcodin = require('bitcodin')(process.env.BITMOVIN_API_TOKEN);

    createOutput(bitcodin, outputPath, jobId);
  }
}

export default BitmovinTransmuxingLambda;
