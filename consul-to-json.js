#!/usr/bin/env node
'use strict';

const program = require('commander');
const pkg = require('./package');
const log = require('./lib/logger');
const clientFactory = require('./lib/client');
const workflowFactory = require('./lib/workflow');

function collectCA(value, items) {
  items.push(value);
}

program.version(pkg.version)
  .usage('[options] <name> [file]')
  .description('Retrieves configuration from consul\'s key value store and stores in a json file.')
  .option('-i, --indent <indent>', 'Indent to pass to JSON.stringify. Default: 2')
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
if (program.verbose) {
  log.transports.console.level = 'debug';
}

let client = clientFactory(program);
let workflow = workflowFactory(client, program.args[0], program.args[1], program.indent);
workflow.exec();
