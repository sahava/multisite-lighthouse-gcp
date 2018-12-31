/**
 * MIT License
 *
 * Copyright (c) 2018 Simo Ahava
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

'use strict';

const sinon = require(`sinon`);
const test = require(`ava`);
const proxyquire = require(`proxyquire`).noCallThru();
const tools = require(`@google-cloud/nodejs-repo-tools`);
const mockLhr = require(`./mock.lhr.json`);

const mockConfig = require(`./config.test.json`);
let config;

function getSample(options) {
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
    save: sinon.stub().returns(Promise.resolve()),
    download: sinon.stub().returns(Promise.resolve())
  };
  const bucketMock = {
    file: sinon.stub().returns(fileMock)
  };
  const storageMock = {
    bucket: sinon.stub().returns(bucketMock)
  };
  const StorageMock = sinon.stub().returns(storageMock);
  const fsMock = {
    writeFile: sinon.stub().returns(Promise.resolve()),
    readFile: sinon.stub().returns(Promise.resolve(JSON.stringify({
      googlesearch: {
        created: options && options.eventTriggerActive ? new Date().getTime() : new Date().getTime() - mockConfig.minTimeBetweenTriggers
      }
    })))
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
  t.deepEqual(console.log.callCount, 5);
  t.deepEqual(console.log.args, [
    [`${id}: Starting browser for ${url}`],
    [`${id}: Browser started for ${url}`],
    [`${id}: Starting lighthouse for ${url}`],
    [`${id}: Lighthouse done for ${url}`],
    [`${id}: Browser closed for ${url}`]
  ]);
});

test.serial(`should launch puppeteer and lighthouse with lighthouseFlags`, async t => {
  // Initialize mocks
  const sample = getSample();
  const id = 'googlesearch';
  const url = 'https://www.google.com/';

  // Call function and verify behavior
  await sample.program._launchBrowserWithLighthouse(id, url);
  t.deepEqual(console.log.callCount, 5);
  t.deepEqual(console.log.args, [
    [`${id}: Starting browser for ${url}`],
    [`${id}: Browser started for ${url}`],
    [`${id}: Starting lighthouse for ${url}`],
    [`${id}: Lighthouse done for ${url}`],
    [`${id}: Browser closed for ${url}`]
  ]);
});

test.serial(`should trigger pubsub for all config ids`, async t => {
  // Initialize mocks
  const sample = getSample();
  const ids = sample.mocks.config.source.map(obj => obj.id);

  // Call function and verify behavior
  await sample.program._sendAllPubSubMsgs(ids);
  t.deepEqual(console.log.callCount, 4);
  t.true(sample.mocks.pubsub.topic.calledWithExactly(sample.mocks.config.pubsubTopicId));
  t.deepEqual(sample.mocks.pubsub.topic().publisher().publish.callCount, 2);
  t.deepEqual(sample.mocks.pubsub.topic().publisher().publish.firstCall.args, [Buffer.from(sample.mocks.config.source[0].id)]);
  t.deepEqual(sample.mocks.pubsub.topic().publisher().publish.secondCall.args, [Buffer.from(sample.mocks.config.source[1].id)]);
  t.deepEqual(console.log.args, [
    [`${ids[0]}: Sending init PubSub message`],
    [`${ids[1]}: Sending init PubSub message`],
    [`${ids[0]}: Init PubSub message sent`],
    [`${ids[1]}: Init PubSub message sent`]
  ]);
});

test.serial(`should return active state if trigger fired < ${mockConfig.minTimeBetweenTriggers/1000}s ago`, async t => {
  // Initialize mocks
  const sample = getSample();
  const expected = {active: true, delta: 10};

  // Call function and verify behavior
  const result = await sample.program._checkEventState('googlesearch', new Date().getTime() - mockConfig.minTimeBetweenTriggers + 10000);
  t.deepEqual(result, expected);
});

test.serial(`should return inactive state if trigger fired >= ${mockConfig.minTimeBetweenTriggers/1000}s ago`, async t => {
  // Initialize mocks
  const sample = getSample();
  const expected = {active: false};

  // Call function and verify behavior
  const result = await sample.program._checkEventState('googlesearch', new Date().getTime());
  t.deepEqual(result, expected);
});

test.serial(`should abort main function if trigger fired < ${mockConfig.minTimeBetweenTriggers/1000}s ago`, async t => {
  // Initialize mocks
  const sample = getSample({eventTriggerActive: true});
  const event = {
    data: Buffer.from('googlesearch').toString('base64')
  };

  // Call function and verify behavior
  await sample.program.launchLighthouse(event);
  t.true(console.log.calledWith(`googlesearch: Found active event (0s < ${mockConfig.minTimeBetweenTriggers/1000}s), aborting...`));
});

test.serial(`should write only object log to gcs bucket if output not defined`, async t => {
  // Initialize mocks
  const sample = getSample();
  delete config.lighthouseFlags.output;
  const mockObj = {
    lhr: {fetchTime: "2018-12-17T10:56:56.420Z"}
  };
  const id = 'ebay';

  // Call function and verify behavior
  await sample.program._writeLogAndReportsToStorage(mockObj, id);
  t.deepEqual(sample.mocks.storage.bucket().file().save.callCount, 1);
  t.true(sample.mocks.storage.bucket.calledWith('lighthouse-reports'));
  t.true(sample.mocks.storage.bucket().file.calledWith(`${id}/log_${mockObj.lhr.fetchTime}.json`));
  t.deepEqual(sample.mocks.storage.bucket().file().save.firstCall.args, [JSON.stringify(mockObj.lhr, null, " "), {metadata: {contentType: 'application/json'}}]);
});

test.serial(`should write object reports and log to gcs bucket if output defined`, async t => {
  // Initialize mocks
  const sample = getSample();
  const mockObj = {
    report: ['report1', 'report2', 'report3'],
    lhr: {fetchTime: "2018-12-17T10:56:56.420Z"}
  };
  const id = 'ebay';

  // Call function and verify behavior
  await sample.program._writeLogAndReportsToStorage(mockObj, id);
  t.deepEqual(sample.mocks.storage.bucket().file().save.callCount, 4);
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

test.serial(`should fire all pubsub triggers with 'all' message`, async t => {
  // Initialize mocks
  const sample = getSample();
  const event = {
    data: Buffer.from('all').toString('base64')
  };

  // Call function and verify behavior
  await sample.program.launchLighthouse(event);
  t.true(sample.mocks.pubsub.topic().publisher().publish.calledWith(Buffer.from('googlesearch')));
  t.true(sample.mocks.pubsub.topic().publisher().publish.calledWith(Buffer.from('ebay')));
});

test.serial(`should catch error`, async t => {
  // Initialize mocks
  const sample = getSample();
  delete config.source;
  const event = {
    data: Buffer.from('all').toString('base64')
  };

  // Call function and verify behavior
  await sample.program.launchLighthouse(event);
  t.deepEqual(console.error.firstCall.args, [new TypeError('Cannot read property \'map\' of undefined')]);
});

test.serial(`should call bigquery load for id when called with id in pubsub message`, async t => {
  // Initialize mocks, test live environment
  process.env.NODE_ENV = 'live';
  const sample = getSample();
  const event = {
    data: Buffer.from(sample.mocks.config.source[0].id).toString('base64')
  };

  // Call function and verify behavior
  await sample.program.launchLighthouse(event);
  t.deepEqual(sample.mocks.bigquery.dataset().table().load.callCount, 1);
});
