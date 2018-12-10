const puppeteer = require('puppeteer');
const lighthouse = require('lighthouse');
const {URL} = require('url');
const config = require('./config.json');
const {BigQuery} = require('@google-cloud/bigquery');
const fs = require('fs');
const uuidv1 = require('uuid/v1');
const {promisify} = require('util');
const writeFile = promisify(fs.writeFile);

const bigquery = new BigQuery({
  projectId: config.projectId
});

async function launchLighthouse(url) {
  console.log(`Starting browser for ${url}`);

  const browser = await puppeteer.launch({args: ['--no-sandbox']});

  console.log(`Browser started for ${url}`);

  browser.on('targetchanged', async target => {
    const page = await target.page();

    if (page && page.url() === url) {
      // Do something with network conditions
      /*
      const client = await page.target().createCDPSession();
      await client.send('Runtime.evaluate', {
        expression: `(${addStyleContent.toString()})('${css}')`
      });*/
    }
  });

  config.lighthouseFlags.port = (new URL(browser.wsEndpoint())).port;

  console.log(`Starting lighthouse for ${url}`);

  const lhr = await lighthouse(url, config.lighthouseFlags);

  console.log(`Lighthouse done for ${url}`);

  await browser.close();

  console.log(`Browser closed for ${url}`);

  return lhr;
}

/*DEBUG
(async() => {
  await Promise.all(config.url.map(async (url) => {
    const uuid = uuidv1();
    const res = await launchLighthouse(url);
    await writeFile(`./${uuid}.csv`, res.report);
  }));
})();
*/

exports.launchLighthouse = async (data, callback) => {
  try {
    console.log('Received message, starting...');

    await Promise.all(config.url.map(async (url) => {

      const uuid = uuidv1();
      const metadata = {
        sourceFormat: 'CSV',
        skipLeadingRows: 1,
        autodetect: true
      };
      const res = await launchLighthouse(url);

      await writeFile(`/tmp/${uuid}.csv`, res.report);

      console.log(`Loading result from ${url} to BigQuery`);

      const bqload = await bigquery
        .dataset(config.datasetId)
        .table('reports')
        .load(`/tmp/${uuid}.csv`, metadata);

      if (bqload[0].status.state === 'DONE') { console.log(`BigQuery load complete for ${url}`) }

    }));
  } catch(e) {
    console.error(e);
  }
};
