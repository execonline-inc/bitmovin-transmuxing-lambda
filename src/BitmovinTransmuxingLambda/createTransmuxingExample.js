const transmuxConfiguration = {
  "filename": "name-it-whatever-you-want.mp4",
  "outputId": parseInt(process.env.OUTPUT_ID)
};

createTransmux = () => {
  const bitcodin = require('bitcodin')(process.env.BITMOVIN_API_TOKEN);
  const jobPromise = bitcodin.job.list(0, 'finished');
  const Q = require("Q");
  Q.all([jobPromise]).then(
    (result) => {
      var jobDetails = result.jobs[0];
      var videoStreamConfigs = jobDetails.encodingProfiles[0].videoStreamConfigs;
      var audioStreamConfigs = jobDetails.encodingProfiles[0].audioStreamConfigs;
      var transmuxConfiguration = {
        "jobId": jobDetails.jobId
      };

      var audioRepresentationIds = [];
      if(audioStreamConfigs.length > 0) {
        for (var i = 0, len = audioStreamConfigs.length; i < len; i++) {
          audioRepresentationIds.push(audioStreamConfigs[i].representationId);
        }
        transmuxConfiguration.audioRepresentationIds = audioRepresentationIds;
      }

      if(videoStreamConfigs.length > 0) {
        transmuxConfiguration.videoRepresentationId = videoStreamConfigs[0].representationId;
      }

      console.log("transmuxConfiguration: " + transmuxConfiguration)
      createTransmuxPromise = bitcodin.transmux.create(transmuxConfiguration);
      createTransmuxPromise.then(
        (transmuxResponse) => {
          transmuxDetails = transmuxResponse;
          console.log('Successfully created a new transmuxing');
        },
        (transmuxDetails) => {
          console.log('Error while creating a new transmuxing', transmuxDetails);
        }
      );
    },
    (error) => {
      console.log(error);
    }
  );
}
