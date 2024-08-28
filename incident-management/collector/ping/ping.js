#!/usr/bin/env node

// ----------
// Modules
// ----------

const {
    getConfig, 
    sendMetrics, 
    isEmpty, 
    isPopulatedList,
} = require('@moogsoft/aim-contrib');
const { Metric } = require('@moogsoft/aim-contrib/Metric');
const { Logger } = require('@moogsoft/aim-contrib/Logger');
const { exec } = require('child_process');
const { Command } = require('commander');
const subnet = require('@moogsoft/aim-contrib/subnet');
const os = require('os');
const EventEmitter = require('events');

const pingEmitter = new EventEmitter();
const program = new Command();
const logger = new Logger();

// -----------------------
// CLI options and parsing
// -----------------------

program
    .name('ping')
    .description('Returns ping response metrics')
    .version('1.0.0')
    .option('-c,--config-file <file>', 'Config file location', './ping.conf')
    .option('-d,--debug');

program.parse();
const options = program.opts();

logger.setDebug(options.debug);

// --------
// Globals
// --------

const hostname = os.hostname();
const cycleDetails = {};
const moobName = 'ping';

// ----------
// Defaults
// ----------

const globalConfig = {
    defaultTimeout: 1,
    defaultCount: 3,
    maxCount: 5,
    maxTimeout: 2,
    frequency: 60,
};

// ----------------------------------------------------
// Metrics definitions
// ----------------------------------------------------

const metricDetails = {
    min: {
        metric: 'min_resp_time',
        description: 'Minimum response time',
        unit: 'ms',
        type: 'gauge',
    },
    max: {
        metric: 'max_resp_time',
        description: 'Maximum response time',
        unit: 'ms',
        type: 'gauge',
    },
    avg: {
        metric: 'avg_resp_time',
        description: 'Average response time',
        unit: 'ms',
        type: 'gauge',
    },
    deviation: {
        metric: 'resp_deviation_time',
        description: 'Response time standard deviation',
        unit: 'ms',
        type: 'gauge',
    },
    jitter: {
        metric: 'jitter',
        description: 'Jitter',
        unit: 'ms',
        type: 'gauge',
    },
    loss: {
        metric: 'packet_loss',
        description: 'Packet loss',
        unit: 'percent',
        type: 'gauge',
    },
};

// ----------------------------------------------------------------

/**
 * Execution function
 */

/**
 * Determine the required arguments/patterns for the target
 * on this platform.
 * @param {object} target - the target data (host, timeout etc.)
 * @return {object} targetArgs - cli options and regexes.
 */

function getTargetArgs(target) {
    // Determine the arguments for this host on this platform

    const platform = process.platform.toLowerCase();

    const targetArgs = {
        host: target.host,
        tags: target.tags && !isEmpty(target.tags) ? target.tags : {},
    };

    const targetCount = target.count
            && Number.isInteger(target.count)
            && parseInt(target.count, 10) <= globalConfig.maxCount
        ? target.count
        : globalConfig.defaultCount;

    const targetTimeout = target.timeout
            && Number.isInteger(target.timeout)
            && parseInt(target.timeout, 10) <= globalConfig.maxTimeout
        ? target.timeout
        : globalConfig.defaultTimeout;

    switch (platform) {
        // ------------- Linux ----------------

        case 'linux':
            targetArgs.args = [`-c ${targetCount}`, '-n', `-W ${targetTimeout}`, target.host];
            targetArgs.shellTimeout = (targetCount + 1) * targetTimeout * 1000;
            targetArgs.responsePattern = /^\d+\sbytes\s+from.*?time\s*=(?<response>\d+(?:\.\d+)?)\s/i;
            targetArgs.summaryPattern = /^\d+\s+packets\s+transmitted,.*?,\s(?<loss>\d+)(?:\.\d+)?%\s+packet\s+loss/i;
            targetArgs.rttPattern = /^rtt\s+min\/avg\/max\/mdev\s+=\s+(?<min>\d+(?:\.\d+)?)\/(?<avg>\d+(?:\.\d+)?)\/(?<max>\d+(?:\.\d+)?)\/(?<deviation>\d+(?:\.\d+)?)\s+/i;
            break;

            // ------------- Win32 ----------------

        case 'win32':
            targetArgs.args = [`-n ${targetCount}`, `-w ${targetTimeout * 1000}`, target.host];
            targetArgs.shellTimeout = (targetCount + 1) * targetTimeout * 1000;
            targetArgs.responsePattern = /^reply\s+from\s+.*?time\s*=\s*(?<response>\d+(?:\.\d+)?)ms\s/i;
            targetArgs.summaryPattern = /^\s*Packets:\s.*?,\sLost\s+=\s+.*?\((?<loss>\d+).*/i;
            targetArgs.rttPattern = /^\s*Minimum\s+=\s+(?<min>\d+)ms,\s+Maximum\s+=\s+(?<max>\d+)ms,\s+Average\s+=\s+(?<avg>\d+)ms.*/i;
            break;

            // ------------- MacOS ----------------

        case 'darwin':
            targetArgs.args = [`-c ${targetCount}`, '-n', `-W ${targetTimeout * 1000}`, target.host];
            targetArgs.shellTimeout = (targetCount + 1) * targetTimeout * 1000;
            targetArgs.responsePattern = /^\d+\sbytes\s+from.*?time\s*=(?<response>\d+(?:\.\d+)?)\s/i;
            targetArgs.summaryPattern = /^\d+\s+packets\s+transmitted,.*?,\s(?<loss>\d+)(?:\.\d+)?%\s+packet\s+loss/i;
            targetArgs.rttPattern = /^round-trip\s+min\/avg\/max\/stddev\s+=\s+(?<min>\d+(?:\.\d+)?)\/(?<avg>\d+(?:\.\d+)?)\/(?<max>\d+(?:\.\d+)?)\/(?<deviation>\d+(?:\.\d+)?)\s+/i;
            break;

        default:
            logger.fatal(`Unsupported platform: ${platform}`, 3);
            return null;
    }
    return targetArgs;
}

/**
 * Process the stdout from the ping exec.
 * @param {object} targetArgs - the target specific data.
 * @param {object} error - the error object from the shell
 * @param {string} stdout - the stdout from the shell
 */

function processPingResults(targetArgs, error, stdout, stderr) {
    // Emit an 'end' signal to allow the next poll to start.
    // Regardless of the outcome of this poll, we'll
    // contiue.

    if (!stdout) {
        logger.debug(`${targetArgs.host} : Failed to get any results from a ping command : ${stderr}`);
        return;
    }

    // Process the results to the metrics we want.

    const pingDetails = stdout.split(/\n/);

    const pingStats = {
        min: undefined,
        max: undefined,
        avg: undefined,
        deviation: undefined,
        jitter: undefined,
        loss: undefined,
        responseTimes: [],
    };

    pingDetails.forEach((entry) => {
        if (targetArgs.rttPattern.test(entry)) {
            const rtt = targetArgs.rttPattern.exec(entry);
            pingStats.min = typeof rtt.groups.min !== 'undefined' ? parseFloat(rtt.groups.min) : null;
            pingStats.max = typeof rtt.groups.max !== 'undefined' ? parseFloat(rtt.groups.max) : null;
            pingStats.avg = typeof rtt.groups.avg !== 'undefined' ? parseFloat(rtt.groups.avg) : null;
            pingStats.deviation = typeof rtt.groups.deviation !== 'undefined' ? parseFloat(rtt.groups.deviation) : null;
        }
        if (targetArgs.summaryPattern.test(entry)) {
            const summary = targetArgs.summaryPattern.exec(entry);
            pingStats.loss = typeof summary.groups.loss !== 'undefined' ? parseFloat(summary.groups.loss) : null;
        }
        if (targetArgs.responsePattern.test(entry)) {
            const respTime = targetArgs.responsePattern.exec(entry);
            if (respTime && respTime.groups && respTime.groups.response) {
                pingStats.responseTimes.push(parseFloat(respTime.groups.response));
            }
        }
    });

    // Calculate jitter - the average of the difference between
    // successive results.

    if (isPopulatedList(pingStats.responseTimes)
            && pingStats.responseTimes.length > 2) {
        let total = 0;
        for (let rIdx = 1; rIdx < pingStats.responseTimes.length; rIdx += 1) {
            const currentValue = pingStats.responseTimes[rIdx];
            const prevValue = pingStats.responseTimes[rIdx - 1];
            const difference = currentValue >= prevValue
                ? currentValue - prevValue
                : prevValue - currentValue;
            total += difference;
        }
        pingStats.jitter = total / (pingStats.responseTimes.length - 1);
    }

    // Create the metrics.

    const results = [];

    ['min', 'max', 'avg', 'deviation', 'jitter', 'loss'].forEach((key) => {
        if (typeof pingStats[key] !== 'undefined' && pingStats[key] !== null) {
            const metric = new Metric()
                .setMetric(`icmp_${metricDetails[key].metric}`)
                .setData(pingStats[key])
                .setSource(`${hostname}`)
                .setDescription(`${metricDetails[key].description}`)
                .setType(`${metricDetails[key].type}`)
                .setKey(`${targetArgs.host}`)
                .setTags(!isEmpty(targetArgs.tags) ? targetArgs.tags : {});

            results.push(metric);
        }
    });

    // If we have no metrics at all, then throw an error

    if (results.length !== 0) {
        sendMetrics(results);
    } else {
        logger.debug(`${targetArgs.host} : Ping command did not return any recognosable metrics`);
    }
}

/**
 * Poll the target
 * @param {object} target - the target details
 */

function icmpPoll(target) {
    // Use an async spawn to use the os 'ping'
    // command.

    const targetArgs = getTargetArgs(target);
    if (!targetArgs || !isPopulatedList(targetArgs.args)) {
        logger.debug(`No arguments could be retrieved for ${target.host}`);
        pingEmitter.emit('end');
        return false;
    }

    exec(`ping ${targetArgs.args.join(' ')}`, { timeout: targetArgs.shellTimeout }, (error, stdout, stderr) => {
        processPingResults(targetArgs, error, stdout, stderr);
        pingEmitter.emit('end');
    });
    return true;
}

/**
 * Get a full list of targets - expand subnets if needed
 * @param {object} targets - a list of target objects
 */

function getTargetDetails(targets) {
    const allTargets = [];

    targets.forEach((t) => {
        if (subnet.validateCidr(t.host) || subnet.validateNetAndMask(t.host)) {
            const subnetData = subnet.getSubnetData(t.host);
            if (subnetData) {
                const addressList = subnet.listHosts(
                    subnetData.firstHostAddress,
                    subnetData.lastHostAddress,
                );

                addressList.forEach((a) => {
                    allTargets.push({
                        host: a,
                        timeout: t.timeout || globalConfig.defaultTimeout,
                        tags: t.tags || {},
                        count: t.count || globalConfig.defaultCount,
                    });
                });
            }
        } else {
            allTargets.push(t);
        }
    });
    return allTargets;
}
/**
 * Execute the collector, manage polls, self schedule
 */

function pollCycle() {
    // Iterate over targets and collect metrics
    // Check the config and calculate concurrency.
    // Refresh the targets on each poll cycle.

    const pollConfig = getConfig();

    try {
        if (!pollConfig.targets || !isPopulatedList(pollConfig.targets)) {
            throw new Error('Configuration did not contain any target information');
        }

        cycleDetails.startTime = Math.round(Date.now() / 1000);
        cycleDetails.completedPolls = [];
        cycleDetails.allTargets = getTargetDetails(pollConfig.targets);
        cycleDetails.numTargets = cycleDetails.allTargets.length;

        // Update defaults from the latest config

        globalConfig.defaultTimeout = Number.isInteger(pollConfig.defaultTimeout)
            ? pollConfig.defaultTimeout
            : globalConfig.defaultTimeout;
        globalConfig.defaultCount = Number.isInteger(pollConfig.defaultCount)
            ? pollConfig.defaultCount
            : globalConfig.defaultCount;
        globalConfig.maxTimeout = Number.isInteger(pollConfig.maxTimeout)
            ? pollConfig.maxTimeout
            : globalConfig.maxTimeout;
        globalConfig.maxCount = Number.isInteger(pollConfig.maxCount)
            ? pollConfig.maxCoun
            : globalConfig.maxCount;

        const configFrequency = Number.isInteger(pollConfig.frequency)
            ? pollConfig.frequency
            : globalConfig.frequency;

        if (configFrequency !== globalConfig.frequency) {
            logger.debug(`Adjusting frequency from ${globalConfig.frequency} to ${configFrequency}s`);
            globalConfig.frequency = configFrequency;
        }

        // Concurrency should be set to a moderate limit in line with
        // system reources (cpus) and process/fd limits.

        const numCpus = os.cpus().length > 1 ? os.cpus().length - 1 : 1;
        let concurrency = pollConfig.concurrency && Number.isInteger(pollConfig.concurrency)
            ? pollConfig.concurrency : numCpus;

        concurrency = concurrency > 50 ? 50 : concurrency;
        logger.debug(`Concurrency set to ${concurrency}, ${cycleDetails.allTargets.length} targets, frequency: ${globalConfig.frequency}s`);

        // ---------------------------------------------------------
        // Execute the initial polls, and then let the poller
        // queue as needed.
        // ---------------------------------------------------------

        const startingQueue = cycleDetails.allTargets.splice(0, concurrency);

        startingQueue.forEach((target) => {
            logger.debug(`Polling ${target.host}`);
            icmpPoll(target);
        });
    } catch (error) {
        throw new Error(`Collector execution failed: ${error.message}`);
    }
}

/**
 * Check the poll status for this cycle, and reschedule once complete.
 * @param {string} target - the target that has completed.
 */

function checkPollStatus(target) {
    cycleDetails.completedPolls.push(target);

    if (cycleDetails.allTargets.length) {
        const nextTarget = cycleDetails.allTargets.shift();
        logger.debug(`Polling next target ${nextTarget.host} from queue`);
        icmpPoll(nextTarget);
    } else if (cycleDetails.completedPolls.length === cycleDetails.numTargets) {
        // If the poll cycle took longer than the frequency, stsrt the poll
        // now, and increase the frequency time to poll time + 20%

        const endTime = Math.round(Date.now() / 1000);
        const pollCycleTime = endTime - cycleDetails.startTime;
        const nextSchedule = cycleDetails.startTime + globalConfig.frequency;
        if (endTime > nextSchedule) {
            const newPollFrequency = Math.round(pollCycleTime * 1.2);
            logger.warn(`Poll cycle time: ${pollCycleTime}s was longer than the defined frequency ${globalConfig.frequency}s, increasing to 120% of poll time (${newPollFrequency}s).`);
            globalConfig.frequency = newPollFrequency;
        }
        const nextPollStartsIn = cycleDetails.startTime + globalConfig.frequency - endTime;
        logger.debug(`Poll cycle complete (${pollCycleTime}s), scheduling next run in ${nextPollStartsIn} seconds`);
        setTimeout(pollCycle, nextPollStartsIn * 1000);
    } else {
        logger.debug('Waiting for outstanding jobs');
    }
}

/**
 * Execute the poll cycle for the first time
 */

function executeCollector() {
    pollCycle();
}

// -------------------------------------------------------
// Collector execution
// -------------------------------------------------------

pingEmitter.on('end', (target) => checkPollStatus(target));

executeCollector();

// -------------------------------------------------------
