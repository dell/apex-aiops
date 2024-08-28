# DNS Plugin

## Description
Collect metrics around resolvability, lookup times for any DNS records and record_types. This Plugin works for nameservers of your choice.

See the configuration section for details of targets and how to lookup set of targets from a specific collector.

## Scope

- [ ] On box
- [x] External polling

## Type
- [ ] Events
- [x] Metrics

## Components

| Name | File 
| --- | --- |
| Discovery | discovery.js |
| Collector | dns.js |
| Config | config/dns.conf  |


## Dependencies
This Plugin uses the underyling node dns module to perform lookups.


### Node Modules (beyond Node base modules).

- @moogsoft/mars-sdk

## Platform Support

- [x] Linux
- [x] Winndows
- [x] MacOSX

## Discovery

The discovery will be successful if:

- There is valid configuration
- The configuration contains a list of targets

## Configuration

The Plugin can be configured via the config file in the plugin directory or via the API, [see](../README.md).

The Plugin needs the following minimum configuration

- Target list
  - A set of targets for dns_lookup
  - This is contained in the config object and is an JSON array.

```
{
  "targets" :
      { <target> },
      { ... }
   ]
}
```

The Plugin can accept the following additional configuration

- frequency : default 60s
- concurrency : how many target to poll concurrently (default 50)

### Target Configuration

A target is a hostname to resolve and contains following configuration.

- name: name of the target
- hostname : hostname for lookup
- nameservers(optional): list of IP address of the name server and name server port to query used to query hostname <nameserver:port>, defaults system conf
- timeout(optional) :  timeout to be applied to DNS query, default to 5 seconds
- resolves_as(optionl): IP addresses that the hostname is expected to resolve as, prevent any maan in the middle attacks and hijacks
- record_type: the record type to be queried against name server
- tags : A tags object to add to the metric

#### Example Configuration

```json
{
    "targets": [
        {
             "name": "google",
             "hostname": "www.google.com",
             "nameservers": [
                 "8.8.8.8:53",
                 "8.8.4.4:53"
             ],
             "timeout": 5,
             "record_type": "A",
             "resolves_as": []
        },
        {
            "name": "geekforgeeks",
            "hostname": "geeksforgeeks.org",
            "timeout": 10,
            "record_type": "MX",
            "resolves_as": [
                "aspmx.l.google.com"
            ]
        }
    ]
}

```

## Output

### Metrics

The source for all metrics will be the Collector hostname, the key will be the target hostname

| Metric Name | Description | Unit |
|---|---|---|
| response_time | The response time for DNS query for a given target |ms
| check | DNS failed query |boolean
