
# Ping (ICMP) Plugin

## Description
This PluginPlugin  performs an ICMP request to a configured set of targets (IP
address, subnets or hostnames) and generates metrics based on the
responses. This Plugin uses the underlying operating system
'ping' command so does not need an additional
privileges.


See the configuration section for details of targeting and how to poll set of targets from a specific Colletor.

## Scope

- [ ] On box
- [x] External polling

## Type
- [ ] Events
- [x] Metrics


## Components


| Name | File 
| --- | --- |
| Discovery | discovery.js  |
| Collector | ping.js |
| Component | ping.moob |
| Config | config/ping.js |


## Dependencies

This Plugin uses the underyling 'ping' command - which
should be available to the collector execution user. The collector script uses a set of standard unrestricted parameters to generate the data, so should not need any on-system configuration.

### Node modules (beyond Node base modules).

- @moogsoft/mars-sdk
- @moogsoft/js-utils
- @moogsoft/js-utils/subnet

## Platform support

- [x] Linux
- [x] Winndows
- [x] MacOSX

## Discovery

The discovery will be successful if:

- There is configuration for the Plugin
- The configuration contains a list of targets
- The system 'ping' command is available and can be executed.


## Configuration

The Plugin can be configured via the config file in the plugin directory or via the API, [see](../README.md).

The Plugin needs the following minimum configuration

- Target list
  - A set of targets to poll
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


**Warning**<br>
*Increased concurrency increase system resources used by the Plugin
(memory, cpu, file descriptors, processes etc.) - care should be taken to balance t= he concurrency value against the resources the Collectorhas (as a process).*


- defaultTimeout : (default 1) - the ICMP timeout to use if the target has none specified.
- defaultCount : (default 3) - the number of pings to do if the target has none specified.

**Note**<br>
The 'jitter' metric requires at minimum of 3 pings to produce a useable metric. If the number of pings is below this, then
the jitter metric will not be calculated.
- maxCount : (default 5) - the maximum number of pings to do per targe= t
- maxTimeout : (default 2) - the maximum timeout allowed

### Target configuration

A target is an IP address or hostname to ping and has the following
allowed configuration

- host : subnet, hostname or ip address to be polled.
- timeout : the ping timeout to be applied - will be governed by the global maxTimeout value
- count : the ping count to be used - will be governed by the global maxCount
- tags : A tags object to add to the metric

### Subnet polling

A target'host' can be a single target or can be specified as a subnet using either the /nn (bits) or nnn.nnn.nnn.nnn
notation.

e.g.

```
10.0.0.0/24
host : 10.0.0.0/255.255.255.0
```

The Plugin will calculate the first and last addresses in the subnet and will poll all the ip address within the range. All target parameters (e.g. tags, count and timeout) are inherited by the members of the
subnet.

#### Example Config

```json
{
    "frequency" : 33,
    "concurrency": 50,
    "defaultTimeout": 1,
    "defaultCount": 5,
    "targets" : [
        {
            "host" : "10.0.0.1",
            "timeout" :  2,
            "tags" : {
                "name" : "MyRouter",
                "vendor" : "NetGear"
            }
        },
        {
            "host" : "10.0.0.34",
            "timeout" :  2,
            "tags" : {}
        },
        {
            "host" : "172.16.225.145",
            "timeout" :  2,
            "tags" : {}
        },
        {
            "host" : "172.16.225.146",
            "timeout" :  2,
            "tags" : {}
        },
        {
            "host" : "172.16.226.0/30",
            "timeout" :  2,
            "tags" : {}
        }
    ]
}
```
## Output

### Metrics


The source for all metrics will be the Collector hostname, the key will be the target address or hostname

| Metric name | Description | Unit |
|---|---|---|
| min_resp_time | The minimum response time in this poll |ms
| max_resp_time | The maximum response time in this poll |ms
| avg_resp_time | The average response time in this poll |ms
| resp_deviation_time | The standard deviation of the responses in this poll | ms
| jitter | The jitter of the responses in this poll. Calculated by from the average of differences between successive polls | ms
| packet\_loss | The percentage packet loss in this poll. This is treated as a threshold metric - low 0, high 10. |%


