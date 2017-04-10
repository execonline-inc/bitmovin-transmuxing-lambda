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

    //FIRST CREATE THE OUTPUT
    bitcodin.output.s3.create(lowOutputParams).then(
      (createOutputResponse) => {
        //THE LIST THE OUTPUTS AND GET THE ID THE OF THE ONE YOU JUST CREATED
        bitcodin.output.list(0, 'finished').then(
          (outputResponse) => {
            outputDetails = outputResponse.outputs[0];
            let transmuxConfiguration = {
              "filename": "low.mp4",
              "outputId": outputDetails.outputId
            };
            //LIST THE JOBS AND GET THE ONE JUST CREATED
            //if i change below to bitcodin.job.list(0) it gets the correct job, but 
            //i get a 400 error because the job is not found (hasnt been created yet)
            //need to wait until job is created to run this function, or kick it off 
            //after the job has already been finished, like maybe from another lambda function
            bitcodin.job.list(0, 'finished').then(
              (jobResponse) => {
                console.log("transmuxConfiguration 0 of 3: " + JSON.stringify(transmuxConfiguration))
                jobDetails = jobResponse.jobs[0];
                console.log("jobDetails: " + JSON.stringify(jobDetails))
                var videoStreamConfigs = jobDetails.encodingProfiles[0].videoStreamConfigs;
                var audioStreamConfigs = jobDetails.encodingProfiles[0].audioStreamConfigs;
                transmuxConfiguration.jobId = jobDetails.jobId;
                console.log("transmuxConfiguration 1 of 3: " + JSON.stringify(transmuxConfiguration))

                var audioRepresentationIds = [];
                if(audioStreamConfigs.length > 0) {
                  for (var i = 0, len = audioStreamConfigs.length; i < len; i++) {
                    audioRepresentationIds.push(audioStreamConfigs[i].representationId);
                  }
                  transmuxConfiguration.audioRepresentationIds = audioRepresentationIds;
                }

                if(videoStreamConfigs.length > 0) {
                  transmuxConfiguration.videoRepresentationId = videoStreamConfigs[4].representationId;
                }

                console.log("transmuxConfiguration 2 of 3: " + JSON.stringify(transmuxConfiguration))
                //CREATE A TRANSMUX
                bitcodin.transmux.create(transmuxConfiguration).then(
                  (transmuxResponse) => {
                    console.log("transmuxConfiguration: " + JSON.stringify(transmuxConfiguration))
                    console.log("transmuxResponse: " + JSON.stringify(transmuxResponse))
                    transmuxDetails = transmuxResponse;
                    transmuxings.push(transmuxResponse);
                    console.log('Successfully created a new transmuxing');
                  },
                  (transmuxDetails) => {
                    console.log('Error while creating a new transmuxing', transmuxDetails);
                  }
                );
              },
              (outputError) => {
              console.log('Error while creating a new output', outputError);
              }
            );
          },
          (outputError) => {
            console.log('Error while creating a new output', outputError);
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
