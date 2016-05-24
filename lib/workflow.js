'use strict';

const jptr = require('json-ptr');
const _ = require('lodash');
const Promise = require('bluebird');
const log = require('./logger');
const writeFile = Promise.promisify(require('fs').writeFile);

const ignoreNotFound = (err) => {
  if (err.message !== 'not found') {
    log.error(err);
    return process.exit(99);
  }
  return [];
};

const isNormalInteger = (str) => {
  var n = ~~Number(str);
  return String(n) === str && n >= 0;
};

const fixArrays = (object) => {
  var isArray = true;
  var values = [];
  var key;

  for (key in object) {
    if (object[key] !== null && typeof object[key] === 'object') {
      object[key] = fixArrays(object[key]);
    }
    if (!isNormalInteger(key)) {
      isArray = false;
    } else {
      values.push(object[key]);
    }
  }
  if (isArray) {
    return values;
  }
  return object;
};

/*
 * Creates a workflow that will synchronize one or more JSON files with consul's key-value store.
 * @param client - a consul client, requires that kv functions have been promisified
 * @param files - list of files to synchronize
 */
module.exports = (client, prefix, output, indent) => {
  let workflow = { stats: { itemCount: 0 } };

  const getFromConsul = () => {
    log.debug(`Getting all values for "shared" and "${prefix}"`);
    return Promise.all([
      client.kv.getAsync({ key: 'shared', recurse: true })
        .catch(ignoreNotFound),
      client.kv.getAsync({ key: prefix, recurse: true })
        .catch(ignoreNotFound)
    ]);
  };

  const createObjectFromResults = (results) => {
    var all = _.flatten(results);
    var result = {};
    workflow.stats.itemCount += all.length;
    _.each(all, (item) => {
      if (item) {
        jptr.set(result, '#/' + item.Key.replace(/[^/]+\//, ''), item.Value, true);
      }
    });
    return fixArrays(result);
  };

  const formatOutput = (result) => {
    return JSON.stringify(result, null, indent === undefined ? 2 : indent);
  };

  const writeFileOutput = (result) => {
    log.info(`Configuration retrieved successfully with ${workflow.stats.itemCount} values.`);
    return writeFile(output, result, { encoding: 'utf-8' });
  };

  /*
   * Executes the workflow
   * @returns {Promise} a promise that is resolved when the workflow is complete
   */
  workflow.exec = () => {
    return getFromConsul()
      .then(createObjectFromResults)
      .then(formatOutput)
      .then(output ? writeFileOutput : console.log);
  };

  return workflow;
};
