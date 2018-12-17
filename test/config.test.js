const test = require(`ava`);
const tools = require(`@google-cloud/nodejs-repo-tools`);
const {Validator} = require(`jsonschema`);
const configSchema = require(`../config.schema.json`);

const mockConfig = require(`./config.test.json`);
let config;

test.beforeEach(() => {
  config = JSON.parse(JSON.stringify(mockConfig));
  tools.stubConsole();
});
test.afterEach.always(tools.restoreConsole);

test.serial(`should fail without a source array`, async t => {
  delete config['source'];
  const validator = new Validator;
  console.error(validator.validate(config, configSchema).errors[0]);
  t.deepEqual(console.error.firstCall.args[0].message, 'requires property "source"');
});

test.serial(`should fail without an url in source`, async t => {
  delete config.source[0].url;
  const validator = new Validator;
  console.error(validator.validate(config, configSchema).errors[0]);
  t.deepEqual(console.error.firstCall.args[0].message, 'requires property "url"');
});

test.serial(`should fail without an id in source`, async t => {
  delete config.source[0].id;
  const validator = new Validator;
  console.error(validator.validate(config, configSchema).errors[0]);
  t.deepEqual(console.error.firstCall.args[0].message, 'requires property "id"');
});

test.serial(`should fail without a projectId in source`, async t => {
  delete config.projectId;
  const validator = new Validator;
  console.error(validator.validate(config, configSchema).errors[0]);
  t.deepEqual(console.error.firstCall.args[0].message, 'requires property "projectId"');
});

test.serial(`should fail without a datasetId in source`, async t => {
  delete config.datasetId;
  const validator = new Validator;
  console.error(validator.validate(config, configSchema).errors[0]);
  t.deepEqual(console.error.firstCall.args[0].message, 'requires property "datasetId"');
});

test.serial(`should fail without a pubsubTopicId in source`, async t => {
  delete config.pubsubTopicId;
  const validator = new Validator;
  console.error(validator.validate(config, configSchema).errors[0]);
  t.deepEqual(console.error.firstCall.args[0].message, 'requires property "pubsubTopicId"');
});

test.serial(`should fail with invalid lighthouseflags value`, async t => {
  config.lighthouseFlags = 'notanobject';
  const validator = new Validator;
  console.error(validator.validate(config, configSchema).errors[0]);
  t.deepEqual(console.error.firstCall.args[0].message, 'is not of a type(s) object');
});

test.serial(`should fail without minTimeBetweenTriggers`, async t => {
  delete config.minTimeBetweenTriggers;
  const validator = new Validator;
  console.error(validator.validate(config, configSchema).errors[0]);
  t.deepEqual(console.error.firstCall.args[0].message, 'requires property "minTimeBetweenTriggers"');
});

test.serial(`should fail without gcs.bucketName`, async t => {
  config.gcs = {wrongProperty: 'test'};
  const validator = new Validator;
  console.error(validator.validate(config, configSchema).errors[0]);
  t.deepEqual(console.error.firstCall.args[0].message, 'requires property "bucketName"');
});
