'use strict';

var exec = require('child_process').exec;
var expect = require('chai').expect;
var Promise = require('bluebird');
var consul = require('consul');

function execute(commandLine) {
  return new Promise(function(resolve, reject) {
    exec(commandLine, {
      cwd: __dirname,
      env: process.env
    }, function(err, stdout, stderr) {
      if (err) {
        reject(err);
      } else {
        resolve({ stdout: stdout, stderr: stderr });
      }
    });
  });
}

describe('consul-to-json', function() {
  var config = {
    host: process.env.CONSUL_HOST || 'consul.service.consul',
    port: process.env.CONSUL_PORT || '8500',
    secure: process.env.CONSUL_SECURE === 'true'
  };

  var client = consul(config);
  Promise.promisifyAll(client.kv);

  before(function(){
    return execute('node ../node_modules/consul-kv-sync/consul-kv-sync.js ./shared.json')
      .then(function() {
        return execute('node ../node_modules/consul-kv-sync/consul-kv-sync.js ./service.json');
      });
  });

  after(function(){
    return client.kv.delAsync({ key:'shared', recurse:true })
      .then(function(){
        return client.kv.delAsync({ key:'service', recurse:true });
      });
  });

  describe('#run', function() {
    var output;
    describe('non-existant service configuration', function(){
      before(function(){
        return execute('node ../consul-to-json.js my-other-service')
          .then(function(result){
            output = JSON.parse(result.stdout.toString());
          });
      });

      it('should set output valid json', function() {
        expect(output).to.be.ok;
      });

      it('should set values to only shared values', function() {
        expect(output.one).to.eql('shared value 1');
        expect(output.two).to.be.undefined;
        expect(output.three).to.eql('shared value 3');
      });
    });

    describe('existing service configuration', function(){
      before(function(){
        return execute('node ../consul-to-json.js service')
          .then(function(result){
            output = JSON.parse(result.stdout.toString());
          });
      });

      it('should set unique value to correct value', function() {
        expect(output).to.be.ok;
        expect(output.two).to.eql('value 2');
      });

      it('should set shared value to correct value', function() {
        expect(output).to.be.ok;
        expect(output.three).to.eql('shared value 3');
      });

      it('should set overridden value to correct value', function() {
        expect(output).to.be.ok;
        expect(output.one).to.eql('value 1');
      });

      it('should set array values correctly', function() {
        var items = output.arrayOne;
        expect(items.length).to.eql(3);
        expect(items[0]).to.eql('a');
        expect(items[1]).to.eql('b');
        expect(items[2]).to.eql('c');
      });
    });
  });
});
