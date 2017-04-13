# bitmovin-transmuxin-lambda
 The bitmovin-transmuxing-lambda is a lambda function that allows for asynchronous transmuxing of completed bitmovin encoding jobs.  This function is triggered by a bitmovin notification when a bitmovin encoding job finishes transfering to our S3 bucket.  The lambda parses the jobId and outputUrl from the message, creates transmuxes of a few of the streams (.mp4 files), and outputs those transmuxes to the same S3 folder where the livestreams are for that job.
 
# Setup

`npm install`

# Deploy

## Development

`SLS_DEBUG='*' serverless webpack invoke --function test` to test with serverless locally. You may need to set SLS_DEBUG: `export SLS_DEBUG='*'`

## Staging

1. `serverless deploy --stage staging --verbose`
1. Configure lambda: add any environment variables and values, adjust the timeout if needed (up to 5 minutes), enable a trigger for your function, add a test event (json).

## Production

1. `serverless deploy --stage production --verbose`
1. Configure lambda: add any environment variables and values, adjust the timeout if needed (up to 5 minutes), enable a trigger for your function, add a test event (json).
