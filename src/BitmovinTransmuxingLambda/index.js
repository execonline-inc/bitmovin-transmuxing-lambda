const videoStreamIndex = (quality) => {
  switch (quality) {
    case 'low.mp4': return 4;
    case 'medium.mp4': return 2;
    case 'high.mp4': return 0;
  }
} 

const getRepresentationId = (quality, videoStreamConfigs) => {
  const idx = videoStreamIndex(quality);
  const config = videoStreamConfigs[idx];
  if (config) return config.representationId;
} 

const createTransmux = quality => (bitcodin, jobs) => {
  let transmuxings = [];
  let transmuxDetails;
  let lowOutputParams = {
    "type": "s3",
    "name": "staging/",
    "region": "us-east-1",
    "accessKey": process.env.AWS_KEY,
    "secretKey": process.env.AWS_SECRECY_KEY,
    "bucket": "execonline-staging-video",
    "prefix": "bitmovin/" + jobs.jobs[0].outputPath.match(/[0-9]{2,}_[A-z 0-9]+$/)[0],
    "makePublic": true
  };

  let transmuxConfiguration = {
    "filename": quality + ".mp4"
  };

  bitcodin.output.s3.create(lowOutputParams).then(
    (createOutputResponse) => {
      bitcodin.output.list(0, 'finished').then(
        (outputResponse) => {
          let outputDetails = outputResponse.outputs[0];
          transmuxConfiguration.outputId = outputDetails.outputId

          bitcodin.job.list(0, 'finished').then(
            (jobResponse) => {
              let jobDetails = jobResponse.jobs[0];
              let videoStreamConfigs = jobDetails.encodingProfiles[0].videoStreamConfigs;
              let audioStreamConfigs = jobDetails.encodingProfiles[0].audioStreamConfigs;
              transmuxConfiguration.jobId = jobDetails.jobId;

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
            console.log('Error while listing jobs', jobError);
            }
          );
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

class BitmovinTransmuxingLambda {
  createTransmuxes = () => {
    const bitcodin = require('bitcodin')(process.env.BITMOVIN_API_TOKEN);
    bitcodin.job.list(0, 'finished').then(
      (jobs) => {
        this.createLowTransmux(bitcodin, jobs);
        this.createMediumTransmux(bitcodin, jobs);
        this.createHighTransmux(bitcodin, jobs);
      },
      (err) => {
        console.error(err);
      }
    );
  }

  createLowTransmux = createTransmux("low");

  createMediumTransmux = createTransmux("medium");

  createHighTransmux = createTransmux("high");
}

export default BitmovinTransmuxingLambda;
