'use strict';

const exec = require('child_process').exec;
const expect = require('chai').expect;
const Promise = require('bluebird');
const consul = require('consul');

const execute = (commandLine) => {
  return new Promise((resolve, reject) => {
    exec(commandLine, {
      cwd: __dirname,
      env: process.env
    }, (err, stdout, stderr) => {
      if (err) {
        reject(err);
      } else {
        resolve({ stdout: stdout, stderr: stderr });
      }
    });
  });
};

describe('consul-to-json', () => {
  const config = {
    host: process.env.CONSUL_HOST || 'consul.service.consul',
    port: process.env.CONSUL_PORT || '8500',
    secure: process.env.CONSUL_SECURE === 'true'
  };

  const client = consul(config);
  Promise.promisifyAll(client.kv);

  before(() => {
    return execute('node ../node_modules/consul-kv-sync/consul-kv-sync.js ./shared.json')
      .then(() => {
        return execute('node ../node_modules/consul-kv-sync/consul-kv-sync.js ./service.json');
      });
  });

  after(() => {
    return client.kv.delAsync({ key:'shared', recurse:true })
      .then(() => {
        return client.kv.delAsync({ key:'service', recurse:true });
      });
  });

  describe('#run', () => {
    let output;
    describe('non-existant service configuration', () => {
      before(() => {
        return execute('node ../consul-to-json.js my-other-service')
          .then((result) => {
            output = JSON.parse(result.stdout.toString());
          });
      });

      it('should set output valid json', () => {
        expect(output).to.be.ok;
      });

      it('should set values to only shared values', () => {
        expect(output.one).to.eql('shared value 1');
        expect(output.two).to.be.undefined;
        expect(output.three).to.eql('shared value 3');
      });
    });

    describe('existing service configuration', () => {
      before(() => {
        return execute('node ../consul-to-json.js service')
          .then((result) => {
            output = JSON.parse(result.stdout.toString());
          });
      });

      it('should set unique value to correct value', () => {
        expect(output).to.be.ok;
        expect(output.two).to.eql('value 2');
      });

      it('should set shared value to correct value', () => {
        expect(output).to.be.ok;
        expect(output.three).to.eql('shared value 3');
      });

      it('should set overridden value to correct value', () => {
        expect(output).to.be.ok;
        expect(output.one).to.eql('value 1');
      });

      it('should set array values correctly', () => {
        const items = output.arrayOne;
        expect(items.length).to.eql(3);
        expect(items[0]).to.eql('a');
        expect(items[1]).to.eql('b');
        expect(items[2]).to.eql('c');
      });
    });
  });
});
