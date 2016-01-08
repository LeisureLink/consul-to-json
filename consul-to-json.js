#!/usr/bin/env node
'use strict';

var fs = require('fs');
var Promise = require('bluebird');
var program = require('commander');
var jptr = require('json-ptr');
var _ = require('lodash');
var consul = require('consul');

var writeFile = Promise.promisify(fs.writeFile);
var readFile = Promise.promisify(fs.readFile);

var pkg = require('./package.json');

var itemCount = 0;

function collectCA(value, items) {
  items.push(value);
}

// log functions write to stderr so stdout is just the program output
function info(message) {
  console.error(message);
}
function error(message) {
  console.error(message);
}
function debug(message) {
  if (program.verbose) {
    console.error(message);
  }
}

function ignoreNotFound(err){
  if (err.message !== 'not found') {
    error(err);
    return process.exit(99);
  }
  return [];
}

function isNormalInteger(str) {
  var n = ~~Number(str);
  return String(n) === str && n >= 0;
}

function fixArrays(object) {
  var allInts = true;
  var values = [];
  var key;

  for (key in object) {
    if (object[key] !== null && typeof object[key] === 'object') {
      object[key] = fixArrays(object[key]);
    }
    if (!isNormalInteger(key)) {
      allInts = false;
    } else {
      values.push(object[key]);
    }
  }
  if (allInts) {
    return values;
  }
  return object;
}

function createObjectFromKeys(shared, specific) {
  var all = _.flatten([shared, specific]);
  var result = {};
  itemCount += all.length;
  _.each(all, function(item) {
    if (item) {
      jptr.set(result, '#/' + item.Key.replace(/[^/]+\//, ''), item.Value, true);
    }
  });
  return fixArrays(result);
}


program.version(pkg.version)
  .usage('[options] <name> [file]')
  .description('Retrieves configuration from consul\'s key value store and stores in a json file.')
  .option('-H, --host <host>', 'Consul API url. Environment variable: CONSUL_HOST. Default: consul.service.consul')
  .option('-p, --port <port>', 'Consul API port. Environment variable: CONSUL_PORT. Default: 8500')
  .option('-s, --secure', 'Enable HTTPS. Environment variable: CONSUL_SECURE.')
  .option('--ca <ca>', 'Path to trusted certificate in PEM format. Specify multiple times for multiple certificates.', collectCA, [])
  .option('-v, --verbose', 'If present, verbose output provided.')
  .on('--help', function() {
    console.log('  Examples:');
    console.log('');
    console.log('    $ consul-to-json my-service # outputs to stdout');
    console.log('    $ CONSUL_HOST=consul.local consul-to-json my-service ./config.json');
    console.log('    $ consul-to-json --host localhost --port 8500 --secure \\');
    console.log('        --ca root-ca.pem --ca intermediate-ca.pem \\');
    console.log('        my-service ./config.json');
    console.log('');
  });

program.parse(process.argv);
if (!program.args.length) {
  program.outputHelp();
  process.exit(1);
}

Promise.all(_.map(program.ca, readFile)).then(function(certificates) {
  var config = {
    host: program.host || process.env.CONSUL_HOST || 'consul.service.consul',
    port: program.port || process.env.CONSUL_PORT || 8500,
    secure: program.secure || process.env.CONSUL_SECURE === 'true',
    ca: certificates
  };
  debug('Config:');
  debug(config);
  return consul(config);
})
.then(function(client){
  Promise.promisifyAll(client.kv);

  debug('Getting keys for shared and ' + program.args[0]);
  return Promise.all([
    client.kv.getAsync({ key: 'shared', recurse: true })
      .catch(ignoreNotFound),
    client.kv.getAsync({ key: program.args[0], recurse: true })
      .catch(ignoreNotFound)
  ]);
}).then(function(results) {
  var shared = results[0];
  var specific = results[1];
  var config = createObjectFromKeys(shared, specific);
  var output = JSON.stringify(config, null, program.indent === undefined ? 2 : program.indent);

  debug('shared:');
  debug(shared);
  debug(program.args[0] + ':');
  debug(specific);

  if (program.args[1]) {
    return writeFile(program.args[1], output, { encoding: 'utf-8' });
  }
  console.log(output);
}).then(function() {
  if (program.args[1]) {
    info('Configuration retrieved successfully with ' + itemCount + ' values.');
  }
});
