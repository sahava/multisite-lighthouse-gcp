'use strict';

const sinon = require(`sinon`);
const test = require(`ava`);
const proxyquire = require(`proxyquire`).noCallThru();
const tools = require(`@google-cloud/nodejs-repo-tools`);
const mockLhr = require(`./mock.lhr`);

const mockConfig = require(`./config.test.json`);
let config;

function getSample() {
  const tableMock = {
    load: sinon.stub().returns(Promise.resolve())
  };
  const datasetMock = {
    table: sinon.stub().returns(tableMock)
  };
  const bigqueryMock = {
    dataset: sinon.stub().returns(datasetMock)
  };
  const BigQueryMock = sinon.stub().returns(bigqueryMock);
  const publisherMock = {
    publish: sinon.stub().returns(Promise.resolve())
  };
  const topicMock = {
    publisher: sinon.stub().returns(publisherMock)
  };
  const pubsubMock = {
    topic: sinon.stub().returns(topicMock)
  };
  const PubSubMock = sinon.stub().returns(pubsubMock);
  const fileMock = {
    save: sinon.stub().returns(Promise.resolve())
  };
  const bucketMock = {
    file: sinon.stub().returns(fileMock)
  };
  const storageMock = {
    bucket: sinon.stub().returns(bucketMock)
  };
  const StorageMock = sinon.stub().returns(storageMock);
  const fsMock = {
    writeFile: sinon.stub().returns(Promise.resolve())
  };
  const browserMock = {
    close: sinon.stub().returns(Promise.resolve()),
    wsEndpoint: sinon.stub().returns('https://www.google.com:12345/')
  };
  const puppeteerMock = {
    launch: sinon.stub().returns(browserMock)
  };
  const lighthouseMock = sinon.stub().returns(Promise.resolve({report: ['report1', 'report2', 'report3'], lhr: mockLhr}));
  return {
    program: proxyquire(`../`, {
      './config.json': config,
      '@google-cloud/bigquery': {BigQuery: BigQueryMock},
      '@google-cloud/pubsub': {PubSub: PubSubMock},
      '@google-cloud/storage': {Storage: StorageMock},
      'puppeteer': puppeteerMock,
      'lighthouse': lighthouseMock,
      'fs': fsMock,
      'util': {promisify: (req => req)}
    }),
    mocks: {
      config: config,
      BigQuery: BigQueryMock,
      bigquery: bigqueryMock,
      PubSub: PubSubMock,
      pubsub: pubsubMock,
      Storage: StorageMock,
      storage: storageMock,
      fs: fsMock,
      puppeteer: puppeteerMock,
      lighthouse: lighthouseMock
    }
  };
}

test.beforeEach(() => {
  config = JSON.parse(JSON.stringify(mockConfig));
  tools.stubConsole();
});
test.afterEach.always(tools.restoreConsole);

test.serial(`should fail if config doesn't pass validation`, t => {
  // Initialize mocks
  delete config['projectId'];
  const sample = getSample();

  // Call function and verify behavior
  const errorMsg = new RegExp('requires property \\\\"projectId\\\\"');
  t.throws(() => {
    sample.program._init();
  }, errorMsg);

});

test.serial(`should fail without valid pubsub message`, async t => {
  // Initialize mocks
  const sample = getSample();
  const event = {
    data: Buffer.from('invalid_message').toString('base64')
  };
  const expectedMsg = 'No valid message found!';

  // Call function and verify behavior
  await sample.program.launchLighthouse(event);
  t.deepEqual(console.error.firstCall.args, [expectedMsg]);
});

test.serial(`should convert object to ndJson string`, t => {
  // Initialize mocks
  const sample = getSample();
  const expected = '{"item1":"value1"}\n{"item2":"value2"}\n{"item3":"value3"}\n';
  const mockObj = [{item1: 'value1'},{item2: 'value2'},{item3: 'value3'}];

  // Call function and verify behavior
  const result = sample.program._toNdJson(mockObj);
  t.deepEqual(result, expected);
});

test.serial(`should convert lhr to bigquery schema`, t => {
  // Initialize mocks
  const sample = getSample();
  const expected = require(`./mock.parsed_lhr.json`);

  // Call function and verify behavior
  const result = sample.program._createJSON(mockLhr, 'googlesearch');
  t.deepEqual(result, expected);
});

test.serial(`should launch puppeteer and lighthouse without lighthouseFlags`, async t => {
  // Initialize mocks
  const sample = getSample();
  delete config.lighthouseFlags;
  const id = 'googlesearch';
  const url = 'https://www.google.com/';

  // Call function and verify behavior
  await sample.program._launchBrowserWithLighthouse(id, url);
  t.deepEqual(console.log.firstCall.args, [`${id}: Starting browser for ${url}`]);
});

test.serial(`should launch puppeteer and lighthouse with lighthouseFlags`, async t => {
  // Initialize mocks
  const sample = getSample();
  const id = 'googlesearch';
  const url = 'https://www.google.com/';

  // Call function and verify behavior
  await sample.program._launchBrowserWithLighthouse(id, url);
  t.deepEqual(console.log.firstCall.args, [`${id}: Starting browser for ${url}`]);
});

test.serial(`should trigger pubsub for all config ids`, async t => {
  // Initialize mocks
  const sample = getSample();

  // Call function and verify behavior
  await sample.program._sendAllPubSubMsgs(sample.mocks.config.source.map(obj => obj.id));
  t.deepEqual(sample.mocks.pubsub.topic().publisher().publish.callCount, 2);
  t.true(sample.mocks.pubsub.topic.calledWithExactly(sample.mocks.config.pubsubTopicId));
  t.deepEqual(sample.mocks.pubsub.topic().publisher().publish.firstCall.args, [Buffer.from(sample.mocks.config.source[0].id)]);
  t.deepEqual(sample.mocks.pubsub.topic().publisher().publish.secondCall.args, [Buffer.from(sample.mocks.config.source[1].id)]);
});

test.serial(`should write object reports and log to gcs bucket`, async t => {
  // Initialize mocks
  const sample = getSample();
  const mockObj = {
    report: ['report1', 'report2', 'report3'],
    lhr: {fetchTime: "2018-12-17T10:56:56.420Z"}
  };
  const id = 'ebay';

  // Call function and verify behavior
  await sample.program._writeLogAndReportsToStorage(mockObj, id);
  t.true(sample.mocks.storage.bucket.calledWith('lighthouse-reports'));
  t.true(sample.mocks.storage.bucket().file.calledWith(`${id}/report_${mockObj.lhr.fetchTime}.html`));
  t.deepEqual(sample.mocks.storage.bucket().file().save.firstCall.args, ['report1', {metadata: {contentType: 'text/html'}}]);
  t.true(sample.mocks.storage.bucket().file.calledWith(`${id}/report_${mockObj.lhr.fetchTime}.csv`));
  t.deepEqual(sample.mocks.storage.bucket().file().save.secondCall.args, ['report2', {metadata: {contentType: 'text/csv'}}]);
  t.true(sample.mocks.storage.bucket().file.calledWith(`${id}/report_${mockObj.lhr.fetchTime}.json`));
  t.deepEqual(sample.mocks.storage.bucket().file().save.thirdCall.args, ['report3', {metadata: {contentType: 'application/json'}}]);
  t.true(sample.mocks.storage.bucket().file.calledWith(`${id}/log_${mockObj.lhr.fetchTime}.json`));
  t.deepEqual(sample.mocks.storage.bucket().file().save.lastCall.args, [JSON.stringify(mockObj.lhr, null, " "), {metadata: {contentType: 'application/json'}}]);
});

test.serial(`should call bigquery load for id when called with id in pubsub message`, async t => {
  // Initialize mocks
  const sample = getSample();
  const event = {
    data: Buffer.from(sample.mocks.config.source[0].id).toString('base64')
  };

  // Call function and verify behavior
  await sample.program.launchLighthouse(event);
  t.deepEqual(sample.mocks.bigquery.dataset().table().load.callCount, 1);
});
