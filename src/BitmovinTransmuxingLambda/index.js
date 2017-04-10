class BitmovinTransmuxingLambda {

  createTransmuxes = () => {
    const Q = require("Q");
    const bitcodin = require('bitcodin')(process.env.BITMOVIN_API_TOKEN);
    bitcodin.job.list(0, 'finished').then(
      (jobs) => {
        console.log(jobs.jobs[0].outputPath.match(/[0-9]{2,}_[A-z 0-9]+$/)[0])
        this.createLowTransmux(bitcodin, Q, jobs);
        // this.createMediumTransmux(bitcodin, Q, jobPromise, newlyCreatedJob);
        // this.createHighTransmux(bitcodin, Q, jobPromise, newlyCreatedJob);
      },
      (err) => {
        console.error(err);
      }
    );
  }

  createLowTransmux = (bitcodin, Q, jobs) => {
    let transmuxings = [];
    let transmuxDetails;
    let lowOutputParams = {
      "type": "s3",
      "name": "staging/",
      "region": "us-east-1",
      "accessKey": process.env.AWS_KEY,
      "secretKey": process.env.AWS_SECRET_KEY,
      "bucket": "execonline-staging-video",
      "prefix": "bitmovin/" + jobs.jobs[0].outputPath.match(/[0-9]{2,}_[A-z 0-9]+$/)[0],
      "makePublic": true
    };

    bitcodin.output.s3.create(lowOutputParams).then(
      (createOutputResponse) => {
        bitcodin.output.list(0, 'finished').then(
          (outputResponse) => {
            outputDetails = outputResponse.outputs[0];
            let transmuxConfiguration = {
              "filename": "low.mp4",
              "outputId": outputDetails.outputId
            };
            bitcodin.job.list(0, 'finished').then(
              (jobResponse) => {
                jobDetails = jobResponse.jobs[0];
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
                  transmuxConfiguration.videoRepresentationId = videoStreamConfigs[4].representationId;
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
}

export default BitmovinTransmuxingLambda;
