# consul-to-json

Downloads configuration from consul's key-value store.

Usage:

```bash
$ curl -i -X PUT -d 'value 1' http://localhost:8500/v1/kv/shared/key1
$ curl -i -X PUT -d 'value 2' http://localhost:8500/v1/kv/my-api/options/key2
$ consul-to-json --host localhost --port 8500 my-api
# outputs:
# {
#   "key1": "value 1",
#   "options": {
#     "key2": "value 2"
#   }
# }
```

Full help
```
  Usage: consul-to-json [options] <name> [file]

  Retrieves configuration from consul's key value store and stores in a json file.

  Options:

    -h, --help         output usage information
    -V, --version      output the version number
    -H, --host <host>  Consul API url. Environment variable: CONSUL_HOST. Default: consul.service.consul
    -p, --port <port>  Consul API port. Environment variable: CONSUL_PORT. Default: 8500
    -s, --secure       Enable HTTPS. Environment variable: CONSUL_SECURE.
    --ca <ca>          Path to trusted certificate in PEM format. Specify multiple times for multiple certificates.
    -v, --verbose      If present, verbose output provided.

  Examples:

    $ consul-to-json my-service # outputs to stdout
    $ CONSUL_HOST=consul.local consul-to-json my-service ./config.json
    $ consul-to-json --host localhost --port 8500 --secure \
        --ca root-ca.pem --ca intermediate-ca.pem \
        my-service ./config.json
```
