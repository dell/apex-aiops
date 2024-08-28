#!/usr/bin/env node
/*
 * Get DNS metrics
 */

const { Metric } = require('@moogsoft/aim-contrib/Metric');
const { Logger } = require('@moogsoft/aim-contrib/Logger');
const { sendMetrics, printObj, isEmpty, getConfig, isPopulatedList } = require('@moogsoft/aim-contrib');
const { Resolver } = require('dns').promises;
const { Command } = require('commander');
const fs = require('fs');
const assert = require('assert');

const program = new Command();
program 
    .name('dns')
    .description('Returns DNS lookup metrics')
    .version('1.0.0')
    .option('-c,--config-file <file>', 'Config file location', './dns.conf')
    .option('-d,--debug')
  
program.parse();
const options = program.opts();

const logger = new Logger();
logger.setDebug(options.debug);

// --------------------------------------------
// Check configuration is present and populated.
// --------------------------------------------

const config = getConfig(options.configFile);
if (!config || isEmpty(config)) {
    logger.fatal('Expected config not present');
}

if (!isPopulatedList(config.targets)) {
    logger.fatal('Expected config not present - no \'targets\' found');
}

/**
 *
 * @param {*} records dns records
 * @param {*} resolvesAs refers to config target records_as
 */
function checkRecords(rrtype, records, resolvesAs) {
    const recordsIps = [];
    records.forEach((record) => {
        let result = record.toString();
        if (rrtype === 'MX' && typeof record === 'object') {
            result = record.exchange ? record.exchange : null;
        }
        if (result) {
            result = result.toLowerCase();
            if (result.endsWith('.')) {
                result = result.slice(0, -1);
            }
        }
        recordsIps.push(result);
    });

    resolvesAs.forEach((ip) => {
        if (!recordsIps.includes(ip)) {
            throw new assert.AssertionError({
                actual: recordsIps.toString(),
                expected: resolvesAs.toString(),
                message: `resolves_as ${resolvesAs.toString()} not found in dns records ${recordsIps.toString()}`,
            });
        }
    });
}

/**
 * Returns tags object, list of key:value pairs
 * @param {*} target
 */
function getTags(target) {
    const tags = target.tags ? target.tags : {};
    tags.nameservers = target.nameservers ? target.nameservers.join(',') : '';
    tags.recordType = target.record_type ? target.record_type : 'A';
    tags.resolvesAs = target.resolves_as ? target.resolves_as.join(',') : '';
    tags.target = target.name ? target.name : '';
    tags.hostname = target.hostname ? target.hostname : '';
    return tags;
}

/**
 * Collects dns.response_time and dns.check metrics for configured targets
 * @param {*} defaults config defaults for dns targets
 * @param {*} targets list of targets to get the metrics data for
 */
async function check() {
    try {
        const metrics = [];
        const promises = config.targets.map(async (target) => {
            const timeout = target.timeout ? target.timeout : 5;

            // Add more tags if you wish to here
            const rrtypes = ['A', 'CNAME', 'MX'];
            const rrtype = target.record_type ? target.record_type : 'A';
            const resolvesAs = target.resolves_as ? target.resolves_as : [];
            const nameservers = target.nameservers ? target.nameservers : [];

            if (isPopulatedList(resolvesAs) && !rrtypes.includes(rrtype)) {
                throw new Error('"resolves_as" can currently only support A, CNAME and MX records');
            }

            const start = Date.now();

            const resolver = new Resolver(timeout);

            if (isPopulatedList(nameservers)) {
                resolver.setServers(nameservers);
            }
            try {
                const records = await resolver.resolve(target.hostname, rrtype);
                if (records && isPopulatedList(records)) {
                    const millis = Date.now() - start;
                    const seconds = parseInt(Math.floor(millis / 1000), 10);

                    if (millis > 0) {
                        checkRecords(rrtype, records, resolvesAs);

                        // eslint-disable-next-line max-len
                        target.nameservers = isPopulatedList(nameservers) ? nameservers : resolver.getServers();
                        target.record_type = rrtype;

                        // Build response time metrics
                        const respTimeMetric = new Metric()
                            .setMetric('response_time')
                            .setDescription('DNS response time')
                            .setKey(target.hostname)
                            .setData(seconds)
                            .setUnit('seconds')
                            .setAdditionalData({
                                values: records,
                            })
                            .setTags(getTags(target));
                        metrics.push(respTimeMetric);

                        // Build dns check metric
                        const checkMetric = new Metric()
                            .setMetric('check')
                            .setDescription('DNS check ok')
                            .setKey(target.hostname)
                            .setData(true)
                            .setTags(getTags(target));
                        metrics.push(checkMetric);
                    } else {
                        // Build the bitmask datum
                        const metric = new Metric()
                            .setMetric('check')
                            .setDescription('DNS check timedout')
                            .setKey(target.hostname)
                            .setData(false)
                            .setTags(getTags(target));
                        metrics.push(metric);
                    }
                }
            } catch (err) {
                console.log(err);
                if (err.errno && err.errno.toLowerCase() === 'etimeout') {
                    const metric = new Metric()
                        .setMetric('check')
                        .setDescription('DNS check timedout')
                        .setKey(target.hostname)
                        .setData(false)
                        .setTags(getTags(target));
                    metrics.push(metric);
                } if (err.errno && err.errno.toLowerCase() === 'enotfound') {
                    const metric = new Metric()
                        .setMetric('check')
                        .setDescription('DNS check failed')
                        .setKey(target.hostname)
                        .setData(false)
                        .setTags(getTags(target));
                    metrics.push(metric);
                } else {
                    error(err);
                }
            }
        });

        await Promise.allSettled(promises);
        sendMetrics(metrics);
    } catch (err) {
        logger.fatal(err);
        error(err);
    }
}

/**
 * Start collecting metrics
 */
check();
