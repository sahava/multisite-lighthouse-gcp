# multisite-lighthouse-gcp
Run Lighthouse audits on URLs, and write the results daily into a BigQuery table.

# Steps (rewrite)

1. Clone repo.
2. Run `npm install` in directory.
3. Install [Google Cloud SDK](https://cloud.google.com/sdk/).
4. Authenticate with `gcloud auth login`.
5. Create a new GCP project.
6. Enable Cloud Functions API and BigQuery API.
7. Create a new dataset in BigQuery.
8. Run `gcloud config set project <projectId>` in command line.
9. Edit `config.json`, update list of `source` URLs (don't try with more than 10 for now), edit `projectId` to your GCP project ID, edit `datasetId` to the BigQuery dataset ID.
10. Run `gcloud functions deploy launchLighthouse --trigger-topic launch-lighthouse --memory 2048 --timeout 540 --runtime=nodejs8`.
11. Run `gcloud pubsub topics publish launch-lighthouse --message debug`.
12. Verify with Cloud Functions logs and a BigQuery query that the performance data ended up in BQ.
