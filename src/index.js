class BitmovinTranscodeLambda {

  getVideoLink = (message, context, callback) => {
    console.log('message: ' + message);
    message = JSON.parse(message);
    const bucket = message.Records[0].s3.bucket.name;
    const video = message.Records[0].s3.object.key;
    const videoLink = `https://s3.amazonaws.com/${bucket}/${video}`;

    if (video)  {
      console.log(videoLink);
      this.transcodeFromRaw(videoLink);
    } else {
      console.log('missing path to video file, unable to transcode');
    }
  }

  transcodeFromRaw = (link) => {
    const bitcodin = require('bitcodin')(process.env.BITMOVIN_API_TOKEN);
    const createInputPromise = bitcodin.input.create(link);
    const jobConfiguration = {
      "inputId": -1,
      "encodingProfileId": parseInt(process.env.ENCODING_PROFILE_ID),
      "manifestTypes": ["mpd", "m3u8"],
      "outputId": parseInt(process.env.OUTPUT_ID)
    };
    this.triggerEncoding(createInputPromise, jobConfiguration, bitcodin);
  }

  createTransmuxes = (bitcodin, Q, newlyCreatedJob) => {
    this.createLowTransmux(bitcodin, Q, newlyCreatedJob);
    // this.createMediumTransmux(bitcodin, Q, jobPromise, newlyCreatedJob);
    // this.createHighTransmux(bitcodin, Q, jobPromise, newlyCreatedJob);
  }

  createLowTransmux = (bitcodin, Q, newlyCreatedJob) => {
    let transmuxings = [];
    let transmuxDetails;
    let lowOutputParams = {
      "type": "s3",
      "name": "staging/",
      "region": "us-east-1",
      "accessKey": process.env.AWS_KEY,
      "secretKey": process.env.AWS_SECRET_KEY,
      "bucket": "execonline-staging-video",
      "prefix": "bitmovin/" + newlyCreatedJob.outputPath.match(/[0-9]{2,}_[A-z 0-9]+$/),
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

  triggerEncoding = (createInputPromise, jobConfiguration, bitcodin) => {
    const Q = require("Q");
    Q.all([createInputPromise]).then(
      (result) => {
        console.log('Successfully created input and encoding profile');
        jobConfiguration.inputId = result[0].inputId;

        bitcodin.job.create(jobConfiguration)
          .then(
          (newlyCreatedJob) => {
            console.log('Successfully created a new transcoding job:', newlyCreatedJob);
            console.log("OUTPUTPATH JOHNC: " + newlyCreatedJob.outputPath.match(/[0-9]{2,}_[A-z 0-9]+$/));
            console.log('MPD-Url:', newlyCreatedJob.manifestUrls.mpdUrl);
            console.log('M3U8-Url:', newlyCreatedJob.manifestUrls.m3u8Url);
            setTimeout(function() {
              createTransmuxes(bitcodin, Q, newlyCreatedJob);
            }, 500000);
          },
          (error) => {
            console.log('Error while creating a new transcoding job:', error);
          }
        );
      },
      (error) => {
        console.log('Error while creating input and/or encoding profile:', error);
      }
    );
  }
}

export default BitmovinTranscodeLambda;
