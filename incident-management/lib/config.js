/* eslint-disable no-mixed-operators */

// Functions to retrieve, parse and return a config file.

const { Logger } = require('./Logger');
const hjson = require('hjson');
const path = require('path');
const fs = require('fs');

const logger = new Logger(true);

/**
 * Return the current execution directory.
 */

function getRunningDir() {
    return path.dirname(process.argv[1]);
}

/**
 * Return a config file location based on:
 * - The current execution directory
 * - The current executing script (expected to end .js)
 * - A config file name expected to end .conf
 */

function getConfigFileName() {
    const currDir = getRunningDir();
    const currProcess = path.basename(process.argv[1], '.js');
    return `${currDir}/${currProcess}.conf`;
}

/**
 * Retrieve and parse a config file
 */

function getConfig(filename = null) {
    const configFileName = filename || getConfigFileName();
    let configJson = {};
    let configFileContents;

    try {
        fs.accessSync(configFileName, fs.constants.R_OK);
    } catch (existError) {
        logger.warn(`Could not find config file: ${configFileName} : ${existError.message} `);
        return {};
    }

    try {
        configFileContents = fs.readFileSync(configFileName, 'utf8');
    } catch (readError) {
        warn(`Could not read config file: ${configFileName} : ${readError.message} `);
        return {};
    }

    try {
        configJson = hjson.parse(configFileContents);
    } catch (parseError) {
        logger.warn(`Could not parse config file: ${configFileName} : ${parseError.message} `);
        return {};
    }
    return configJson;
}

/**
 * Export our functions
 */

module.exports = {
    getConfig,
};
