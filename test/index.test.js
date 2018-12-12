'use strict';

const sinon = require(`sinon`);
const test = require(`ava`);
const proxyquire = require(`proxyquire`).noCallThru();
const tools = require(`@google-cloud/nodejs-repo-tools`);
const lhrMockObject = require(`./lhrMockObject`);

const table = {load: sinon.stub().returns(Promise.resolve())};
table.get = sinon.stub().returns(Promise.resolve([table]));
const dataset = {table: sinon.stub().returns(table)};
dataset.get = sinon.stub().returns(Promise.resolve([dataset]));
const bigquery = {dataset: sinon.stub().returns(dataset)};
const BigQueryMock = sinon.stub().returns(bigquery);

const mockConfig = require(`./config.test`);

function getSample() {
  const config = mockConfig;
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
  const browserMock = {
    close: sinon.stub().returns(Promise.resolve()),
    on: sinon.stub(),
    wsEndpoint: sinon.stub().returns('https://www.google.com/')
  };
  const puppeteerMock = {
    launch: sinon.stub().returns(Promise.resolve(browserMock))
  };
  const lighthouseMock = sinon.stub().returns(Promise.resolve({
    lhr: lhrMockObject
  }));
  const writeFileMock = sinon.stub();
  return {
    program: proxyquire(`../`, {
      './config.json': config,
      '@google-cloud/bigquery': {BigQuery: BigQueryMock},
      '@google-cloud/pubsub': {PubSub: PubSubMock},
      'puppeteer': puppeteerMock,
      'lighthouse': lighthouseMock
    }),
    mocks: {
      config: config,
      BigQuery: BigQueryMock,
      bigquery: bigqueryMock,
      PubSub: PubSubMock,
      pubsub: pubsubMock,
      lighthouse: lighthouseMock,
      writeFile: writeFileMock
    }
  };
}

test.beforeEach(tools.stubConsole);
test.afterEach.always(tools.restoreConsole);

test.serial(`should fail without valid pubsub message`, async t => {
  // Initialize mocks
  const sample = getSample();
  const event = {
    data: Buffer.from('invalid_message').toString('base64')
  };
  const expectedMsg = 'No valid message found!';

  // Call function and verify behavior
  await sample.program.launchLighthouse(event);
  t.deepEqual(console.log.callCount, 1);
  t.deepEqual(console.log.firstCall.args, [expectedMsg]);
});

test.serial(`should publish all config ids when called with 'all' message`, async t => {
  // Initialize mocks
  const sample = getSample();
  const event = {
    data: Buffer.from('all').toString('base64')
  };
  const expectedMsgs = [
    `${sample.mocks.config.source[0].id}: Sending init PubSub message`,
    `${sample.mocks.config.source[1].id}: Sending init PubSub message`,
    `${sample.mocks.config.source[0].id}: Init PubSub message sent`,
    `${sample.mocks.config.source[1].id}: Init PubSub message sent`
  ];

  // Call function and verify behavior
  await sample.program.launchLighthouse(event);
  t.deepEqual(console.log.callCount, 4);
  t.deepEqual(sample.mocks.pubsub.topic().publisher().publish.callCount, 2);
  t.true(sample.mocks.pubsub.topic.calledWithExactly(sample.mocks.config.pubsubTopicId));

  t.true(console.log.calledWith(expectedMsgs[0]));
  t.deepEqual(sample.mocks.pubsub.topic().publisher().publish.firstCall.args, [Buffer.from(sample.mocks.config.source[0].id)]);
  t.true(console.log.calledWith(expectedMsgs[2]));

  t.true(console.log.calledWith(expectedMsgs[1]));
  t.deepEqual(sample.mocks.pubsub.topic().publisher().publish.secondCall.args, [Buffer.from(sample.mocks.config.source[1].id)]);
  t.true(console.log.calledWith(expectedMsgs[3]));
});

test.serial(`should launch lighthouse for id when called with id in pubsub message`, async t => {
  // Initialize mocks
  const sample = getSample();
  const event = {
    data: Buffer.from(sample.mocks.config.source[0].id).toString('base64')
  };

  // Call function and verify behavior
  await sample.program.launchLighthouse(event);
  t.true(sample.mocks.lighthouse.calledWith(sample.mocks.config.source[0].url));
});