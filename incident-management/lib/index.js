/**
 *
 * Common utility functions used by various utilities.
 *
 * These are contributed and unsupported.
 *
 */

/* eslint no-bitwise: ["error", { "allow": ["<<","&="] }] */

const {
    getSeverity,
    basicSeverityLookup,
    getSeverityTerms,
    removeSeverityTerms,
    getDefaultSeverity,
} = require('./severity');

const {
    isInSubnet,
    maskToBits,
    validateIpv4,
    validateCidr,
    validateNetAndMask,
    addressToInt,
    intToAddress,
    getSubnetData,
    listHosts,
} = require('./subnet');

const {
    getConfig,
} = require('./config');

const { Logger } = require('./Logger');

const logger = new Logger();
logger.setDebug(true);

/**
 * Returns a granular description of an object, always lowercase.
 * @param {object} o - the object to examins - any valid JS primitive
 */

function getObjectType(o) {
    // Get the object prototype, grab the type in a regex, and convert to lowercae.
    if (o === null) {
        return null;
    }
    if (typeof o === 'undefined') {
        return 'undefined';
    }

    return Object.prototype.toString.call(o).match(/^\[object\s(.*)\]/)[1].toLowerCase();
}

/**
 * Returns true in the passed parameter is a populted array
 * @param {array} a - the object to check.
 */

function isPopulatedList(a) {
    return !!(typeof a !== 'undefined' && Array.isArray(a) && a.length > 0);
}

/**
 * Returns the value of a key in an object
 * @param {object} sourceObj - The object to check in
 * @param {string} targetObj - A string representing the key we want the value for.
 */

function getObjectValue(sourceObj, targetObj) {
    if (!sourceObj || !targetObj) {
        logger.debug('getObjectValue: Expected to see (object,string) as parameters');
        return undefined;
    }

    const pathParts = targetObj.split('.');
    const newPathParts = [];

    for (let pIdx = 0; pIdx < pathParts.length; pIdx += 1) {
        if (/.*\[[^\]]+$/.test(pathParts[pIdx])) {
            let ppath = pathParts[pIdx];

            // We were a quoted key with a "."
            // does the next key complete us i.e. have a closeing ] ?

            let terminated = false;
            while (!terminated) {
                pIdx += 1;
                terminated = /.*\]$/.test(pathParts[pIdx]);

                ppath += terminated ? `.${pathParts[pIdx]}` : pathParts[pIdx];
            }
            newPathParts.push(ppath);
        } else {
            newPathParts.push(pathParts[pIdx]);
        }
    }

    const targetObjKeys = newPathParts;

    let objToCheck = sourceObj;

    // Iterate, check existence

    for (let kIdx = 0; kIdx < targetObjKeys.length; kIdx += 1) {
        // Keep adding keys on, until we reach
        // the end or find an undefined.

        // If the object is === null and we are not at the end
        // of the path this level is defined (null), but a lower level will not be.

        if (objToCheck === null && kIdx <= targetObjKeys.length - 1) {
            logger.debug(`Found a null value in path before terminator (key ${kIdx} ${targetObj}`);
            return undefined;
        }

        // If an array ( i.e. terminates in [\d+] - then try that.
        // If a string key (a["b c"]- then add the key part into the mix.

        let objRe;
        if (/.*\[\d+\]$/.test(targetObjKeys[kIdx])) {
            objRe = /(.*?)\[(\d+)\]$/.exec(targetObjKeys[kIdx]);
            if (objRe && objRe.length === 3) {
                const arrayName = objToCheck[objRe[1]];
                const arrayIndex = objRe[2];
                if (Array.isArray(arrayName) && arrayName.length >= arrayIndex - 1) {
                    objToCheck = arrayName[arrayIndex];
                } else {
                    objToCheck = objToCheck[targetObjKeys[kIdx]];
                }
            } else {
                objToCheck = objToCheck[targetObjKeys[kIdx]];
            }
        } else if (/.*?\[['"]?[\w\s.+]+['"]?\]$/.test(targetObjKeys[kIdx])) {
            // if we are xxx[AAbb ccc] split and check.
            objRe = /(.*?)\[['"]?([\w\s.+]+)['"]?\]$/.exec(targetObjKeys[kIdx]);
            if (objRe && objRe.length === 3) {
                const objName = objRe[1];
                const keyName = objRe[2];
                if (!objName) {
                    objToCheck = objToCheck[keyName];
                } else {
                    targetObjKeys[kIdx] = objName;
                    targetObjKeys.splice(kIdx + 1, 0, keyName);
                    objToCheck = objToCheck[objName];
                }
            }
        } else {
            objToCheck = objToCheck[targetObjKeys[kIdx]];
        }

        if (typeof objToCheck === 'undefined') {
            return undefined;
        }
    }
    return objToCheck;
}

/**
 * Return whitespace text from camel case
 * @param {string} text - the text to convert.
 */

function camel2normal(text) {
    if (typeof text === 'string') {
        return text.replace(/\B([A-Z])/g, ' $&');
    }

    return text;
}

/**
 *  Capitalise the first letter of a string o
 * @param {string} str - the string to capitalise
 */

function capitaliseFirstLetter(str) {
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

/**
 * Returns true if an object has no contents.
 */

function isEmpty(obj) {
    return typeof obj === 'object' && obj.constructor === Object && Object.keys(obj).length === 0;
}

/**
 * Checks to see if keys exist and have a value in an object.
 * @param {object} config - The object to check in
 * @param {array} requiredConfigItems - An array of keys to check for
 */

function checkConfig(config, requiredConfigItems) {
    if (!config || !Array.isArray(requiredConfigItems) || getObjectType(config) !== 'object') {
        logger.warn('Expected a list of required config items and a \'config\' object');
        return false;
    }
    for (let itIdx = 0; itIdx < requiredConfigItems.length; itIdx += 1) {
        const item = requiredConfigItems[itIdx];
        if (getObjectType(item) === 'array') {
            let foundOneOf = false;
            for (let iIdx = 0; iIdx < item.length; iIdx += 1) {
                if (typeof getObjectValue(config, item[iIdx]) !== 'undefined') {
                    foundOneOf = true;
                    break;
                }
            }
            if (!foundOneOf) {
                logger.warn(`Required item (one of) : ${item.join(' || ')} not found in the config object, cannot continue`);
                return false;
            }
        } else if (typeof getObjectValue(config, item) === 'undefined') {
            logger.warn(`Required item ${item} not found in the object, cannot continue`);
            return false;
        }
    }
    return true;
}

/**
 * Returns true in the passed parameter is a standard uuid pattern
 * @param {string} guid - the string to check.
 */

function isGUID(guid) {
    return /^\{{0,1}([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})\}{0,1}$/i.test(guid);
}

/**
 * Return the curent epoch in seconds.
 */

function epochDate() {
    return Math.round(Date.now() / 1000);
}

/**
 * Return the curent epoch in milliseconds.
 */

function epochDateMs() {
    return Date.now();
}

/**
 * Retur the passed epoch as a locale specific data string
 * @param {number} epoch - the epoch date to convert
 */

function fromEpochDate(epoch) {
    if (!/^\d+$/.test(epoch)) {
        return 0;
    }
    const d = new Date(0);
    d.setUTCSeconds(parseInt(epoch, 10));
    return d.toLocaleString();
}

/**
 * Substitute object values into a string
 * @param {object} - src - the source object.
 * @param {string} - inputString - the string to sub into
 * @param {boolean} allowError - allow a substution failure.
 * If this is true (default) - the strig will be returned with
 * as many substitutions as possible. If false, a sub
 * failure will return null.
 *
 * returns null (substitution failed to find a value)
 * returns a string with the substituted values
 */

function substitute(src, inputString, allowError = true) {
    // Behaves very much like the template `...`
    // substitute values from an object
    // and return the string.

    if (getObjectType(src) !== 'object' || getObjectType(inputString) !== 'string') {
        logger.debug('substitute() expected an object and string as parameters');
        return null;
    }

    const subRe = /\$\(([:/\w.-_\]['"\s+]+?)\)/g;
    let outputString = inputString;
    let subError = false;
    const matches = [...inputString.matchAll(subRe)];

    matches.forEach((subData) => {
        const sub = subData.pop();
        const toReplace = `$(${sub})`;
        let value = getObjectValue(src, sub);
        if (typeof value !== 'undefined') {
            if (getObjectType(value) === 'object' || getObjectType(value) === 'array') {
                value = JSON.stringify(value);
            }
            value = String(value) ? value : value.toString();
            outputString = outputString.replace(toReplace, value);
        } else {
            subError = true;
        }
    });
    return !allowError && subError ? null : outputString;
}

/**
 * Simple hashing algo
 * @param {string} input - the string to hash
 * @retur {integer} - the hash of the string.
 */

function getHashCode(text) {
    let h = 0;
    if (text.length === 0) {
        return h;
    }
    for (let i = 0; i < text.length; i += 1) {
        const char = text.charCodeAt(i);
        h = (h << 5) - h + char;
        // Convert to 32bit integer.
        h &= h;
    }
    return h;
}

/**
 * Delete the key fom an object using the supplied path
 * @param {object} obj - the object to modify
 * @param {string} path - the path to the key to remove
 * @return {boolean} - true on success
 */

/* eslint no-cond-assign: [ "error", "except-parens" ] */

function deleteObjectKey(obj, path) {
    const re = /\[((?:['][^']+['])|(?:["][^"]+["])|(?:\d+))\]|(\.)?([^.[\]]+)/g;

    let subObj = obj;
    let lastObj = obj;
    let key;
    let Match = true;
    let matches = 0;
    let matchedString = '';

    let match;
    while ((match = re.exec(path)) !== null) {
        // 0 - full match
        // 1 - key (enclosed in [])
        // 2 - .
        // 3 - key (dotted/bare)

        const [full, bracketed, dot, bare] = match;
        matchedString += full;

        if (typeof bracketed !== 'undefined') {
            key = bracketed.replace(/^['"]/, '').replace(/['"]$/, '');
        } else if (typeof bare !== 'undefined') {
            key = bare;
            if (matches && typeof dot === 'undefined') {
                // bare key should be preceeded by '.'
                Match = false;
                break;
            } else if (!matches && typeof dot !== 'undefined') {
                // bare key at start of path shouldn't have a '.'
                Match = false;
                break;
            }
        }

        if (typeof subObj[key] !== 'undefined') {
            lastObj = subObj;
            subObj = subObj[key];
        } else {
            Match = false;
            break;
        }
        matches += 1;
    }

    if (matchedString !== path) {
        // path contained invalid expression
        return false;
    }

    if (Match) {
        if (Array.isArray(lastObj)) {
            lastObj.splice(key, 1);
        } else {
            delete lastObj[key];
        }
        return true;
    }
    return false;
}

/**
 * Object existence in another object
 * isObjectDefined(a , "b.c.d")
 */

function isObjectDefined(sourceObj, targetObj) {
    if (!sourceObj || !targetObj) {
        return false;
    }
    const targetObjKeys = targetObj.split('.');
    let objToCheck = sourceObj;

    // Iterate, check existence

    for (let kIdx = 0; kIdx < targetObjKeys.length; kIdx += 1) {
        // Keep adding keys on, until we reach
        // the end or find an undefined.

        // If the object is === null and we are not at the end
        // of the path this level is defined (null), but a lower level will not be.

        if (objToCheck === null && kIdx <= targetObjKeys.length - 1) {
            logger.debug(`Found a null value in path before terminator (key ${kIdx}) of ${targetObj}`);
            return false;
        }

        objToCheck = objToCheck[targetObjKeys[kIdx]];

        if (typeof objToCheck === 'undefined') {
            return false;
        }
    }
    return true;
}

/**
 * Split a hostname into host and domain
 * @param {string} host - the host to split
 */

function getHostDetails(host) {
    if (validateIpv4(host)) {
        return { host, domain: null };
    }
    const fqdnparts = host.split(/\./);
    return { host: fqdnparts.shift(), domain: fqdnparts.join('.') };
}

/**
 * Flatten an object into a flat structure
 * e.g. {
 *          a : {
 *            b : c
 *          }
 * }
 * would convert to
 * {
 *   a.b : c
 * }
 *
 * This is a recursive function flattening objects
 * and converting arrays to a string
 */

function flattenObject(obj, dest, prefix) {
    const entries = Object.entries(obj);
    const flattenedObj = dest || {};

    entries.forEach(([key, value]) => {
        const stem = prefix ? `${prefix}.${key}` : key;
        const valueType = getObjectType(value);

        if (valueType === 'object') {
            flattenObject(value, flattenedObj, stem);
        } else if (valueType === 'array') {
            flattenedObj[stem] = JSON.stringify(value);
        } else {
            flattenedObj[stem] = value;
        }
    });
    return flattenedObj;
}

/**
 * Remove non-ascii characters from a string.
 * @param {string} message - the text to remove from
 */

function removeNonAscii(message) {
    if (!/^[\040-\377]*$/.test(message)) {
        return message.replace(/[^\040-\377]/g, '');
    }
    return message;
}

/**
 * Convert a integer (0-11) to a month
 */

function numToMonth(month) {
    const months = {
        0: 'Jan',
        1: 'Feb',
        2: 'Mar',
        3: 'Apr',
        4: 'May',
        5: 'Jun',
        6: 'Jul',
        7: 'Aug',
        8: 'Sep',
        9: 'Oct',
        10: 'Nov',
        11: 'Dec',
    };
    return typeof months[month] !== 'undefined' ? months[month] : null;
}

/**
 * Convert a month (Jan-Dec) to an integer
 */

function monthToNum(month) {
    const months = {
        jan: 0,
        feb: 1,
        mar: 2,
        apr: 3,
        may: 4,
        jun: 5,
        jul: 6,
        aug: 7,
        sep: 8,
        oct: 9,
        nov: 10,
        dec: 11,
    };
    return typeof months[month.toLowerCase()] !== 'undefined' ? months[month.toLowerCase()] : null;
}

function jsonParse(value) {
    try {
        return JSON.parse(value);
    } catch (e) {
        return value;
    }
}

/**
 * Converts the input number to a hex string prefixed with 0x
 * @param {Number} num -- the input value
 * @return {String} the hex string
 */

function toHex(num) {
    if (!Number.isInteger(num)) {
        throw new Error(`toHex must be called with an integral numeric value, input value [${num}] invalid`);
    } else {
        return `0x${num.toString(16)}`;
    }
}

/**
 * JSONToKv - Builds an array of key-value pairs from nested JSON/BSON
 *
 * @param {Object} - A nested object of keys and values
 * @param {Object} - The array to be populated with KV pairs
 * @param {Function} - A function to format the key/value pairs
 * @param {String} - (Optional) the last key processed (for iteration)
 *
 */
function JSONToKv(object, array, func, lkey) {
    const keys = Object.keys(object);
    const lastkey = typeof lkey !== 'undefined' ? lkey : '';

    keys.forEach((element) => {
        if (typeof object[element] === 'string' && object[element] === '$numberlong') {
            array.push(func(element, object[element]));
        } else {
            const newkey = lastkey !== '' ? `${lastkey}_${element}` : element;

            if (typeof object[element] === 'number') {
                array.push(func(newkey, object[element]));
            }

            if (typeof object[element] === 'object') {
                JSONToKv(object[element], array, func, newkey);
            }
        }
    });
}

/**
 * Filter based on an array of regex
 *
 * @param {string} item - The namespacestring we're testing
 * @param {array} flist - The array containing the list of regex's
 */
function passFilter(item, flist) {
    let ret = true;
    if (flist.length > 0) {
        if (item.search(flist.join('|')) >= 0) ret = false;
    }
    return ret;
}

/**
 * Filter based on an array of regex
 *
 * @param {string} item - The namespacestring we're testing
 * @param {array} flist - The array containing the list of strings or regex's
 * @returns {boolean}
 */
function isInFilters(item, filters) {
    // Return true if the item
    // is either an equality match or
    // a regex match in the filters.

    if (!Array.isArray(filters)) {
        return false;
    }

    const inFilters = false;

    for (let fIdx = 0; fIdx < filters.length; fIdx += 1) {
        const filter = filters[fIdx];
        if (/^(!)?\/.*\/$/.test(filter)) {
            const filterExtract = /^(?:!)?\/(.*)\/$/.exec(filter);
            try {
                const filterRe = new RegExp(filterExtract[1]);
                if (/^!/.test(filter)) {
                    // Testing for a not match
                    if (!filterRe.test(item)) {
                        logger.debug(`${item} matches regex !${filterRe}`);
                        return true;
                    }
                    logger.debug(`${item} excluded by not regex !${filterRe}`);
                } else if (filterRe.test(item)) {
                    logger.debug(`${item} matches regex ${filterRe}`);
                    return true;
                } else {
                    logger.debug(`${item} does not match regex ${filterRe}`);
                }
            } catch (e) {
                logger.warn(`Failed to construct a regular expression from ${filterExtract[1]} ${e}`);
            }
        } else if (item === filter) {
            logger.debug(`${item} has equality with ${filter}`);
            return true;
        }
    }
    return inFilters;
}

/**
 * Normalise/de-humanize a value
 *
 * Takes an input like "10Mb", "5 Kb" or "12.3Kb" and returns
 * a numeric value in bytes
 *
 * @param {string} str - The input string to format
 */

function dehumanize(humanStr) {
    const str = humanStr.replace(/ps/, '');
    const suf = str.replace(/[. 0-9]/g, '');
    let val = parseFloat(str.replace(/[^0-9.]/g, ''));

    switch (suf.toLowerCase()) {
        case 'b':
        case 'bi':
        case 'bytes':
            break;
        case 'k':
        case 'kb':
        case 'ki':
        case 'kib':
            val *= 1024;
            break;
        case 'm':
        case 'mb':
        case 'mi':
        case 'mib':
            val = val * 1024 * 1024;
            break;
        case 'g':
        case 'gb':
        case 'gi':
        case 'gib':
            val = val * 1024 * 1024 * 1024;
            break;
        default:
    }
    return val.toFixed();
}

/**
 * Get the members of an array, the top member and
 * citations per memmber
 * @param {array} The list of members.
 */

function getArrayCitations(inputArray) {
    const arrayData = {
        members: [], citations: [], topMember: null, membersByCitation: [],
    };

    if (!isPopulatedList(inputArray)) {
        return arrayData;
    }

    inputArray.forEach((e, index, thisArray) => {
        thisArray[index] = typeof e !== 'string' ? e.toString() : e;
    });

    const tmpArray = inputArray.filter((element) => element);

    if (tmpArray.length === 0) {
        return arrayData;
    }

    // Case insensitive sort.

    tmpArray.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

    // Reduce over the array - comparing prev to curr - add to citations if equal
    // start with a null string and ignore case.

    tmpArray.reduce((prev, curr) => {
        if (prev.toLowerCase() !== curr.toLowerCase()) {
            arrayData.members.push(curr);
            arrayData.citations.push(1);
        } else {
            arrayData.citations[arrayData.citations.length - 1] += 1;
        }
        return curr;
    }, '');

    // Build an array of objects (source:citations) to allow an easier reverse bubble sort.

    let memberByCitationMap = arrayData.members.map((element, index) => (
        { name: element, citations: arrayData.citations[index] }
    ));

    // Get a reverse "bubble" sorted lists, most common to least
    // Set the topMember to be the most common

    memberByCitationMap = memberByCitationMap.sort((a, b) => b.citations - a.citations);
    arrayData.topMember = memberByCitationMap[0].name;

    // We've got a sorted list, turn this into an array of elements "name (citation)"

    arrayData.membersByCitation = memberByCitationMap.map((element) => `${element.name} (${element.citations})`);
    return arrayData;
}

/**
 * Return a uniquified list from an array
 * @param {array} the list to make unique
 */

function uniqArray(a) {
    if (!Array.isArray(a) || a.length === 0) { return a; }
    const uArray = [];
    for (let aIdx = 0; aIdx < a.length; aIdx += 1) {
        if (uArray.indexOf(a[aIdx]) === -1) {
            uArray.push(a[aIdx]);
        }
    }
    return uArray;
}

/**
 * Checks if the input string is a hex string prefixed with 0x
 * @param {String} input - the input string
 * @return {boolean} true iff the string represents a hex string prefixed with 0x
 *
 */
function isHex(input) {
    if (typeof input !== 'string') {
        return false;
    }

    // Now that we know it's a string, validate the prefix
    if (!input.startsWith('0x')) {
        return false;
    }

    const stripped = input.substring(2);
    const parsed = parseInt(stripped, 16);

    return parsed.toString(16) === stripped;
}

/**
 * Print an object
 */

function printObj(obj) {
    process.stdout.write(`${JSON.stringify(obj, null, 4)}\n`);
}

/**
 * Send a batch of metrics to stdout after validation.
 */
function sendMetrics(metrics) {
    // Do some validation
    if (typeof metrics === 'undefined' || metrics === null) {
        logger.debug('Received null metrics, skipping');
    } else {
        let metricsToSend = jsonParse(metrics);
        if (!Array.isArray(metricsToSend)) {
            metricsToSend = [metricsToSend];
        }
        metricsToSend = metricsToSend.filter((m) => {
            try {
                if (m.constructor.name !== 'Metric') {
                    logger.debug('Received element that was not a `Metric`, skipping it');
                    return false;
                }
                m.validate();
                return true;
            } catch (e) {
                logger.debug(`Received malformed metric - ${e.message}, skipping`);
                return false;
            }
        });

        if (metricsToSend.length > 0) {
            process.stdout.write(`${JSON.stringify(metricsToSend)}\n`);
        }
    }
}

function sendEvents(events) {
    // Do some validation
    if (typeof events === 'undefined' || events === null) {
        logger.debug('Received null events, skipping');
    } else {
        let eventsToSend = jsonParse(events);
        if (!Array.isArray(eventsToSend)) {
            eventsToSend = [eventsToSend];
        }

        eventsToSend = eventsToSend.filter((e) => {
            try {
                if (e.constructor.name !== 'Event') {
                    logger.debug('Received element that was not an `Event`, skipping it');
                    return false;
                }

                e.validate();
                return true;
            } catch (err) {
                logger.debug(`Received malformed event - ${err.message}, skipping`);
                return false;
            }
        });

        if (eventsToSend.length > 0) {
            process.stdout.write(`${JSON.stringify(eventsToSend)}\n`);
        }
    }
}

// ---------------------------------------------------------------

module.exports = {
    getObjectType,
    isPopulatedList,
    camel2normal,
    capitaliseFirstLetter,
    isEmpty,
    checkConfig,
    isGUID,
    epochDate,
    epochDateMs,
    fromEpochDate,
    getHashCode,
    deleteObjectKey,
    isObjectDefined,
    getHostDetails,
    flattenObject,
    removeNonAscii,
    numToMonth,
    monthToNum,
    jsonParse,
    toHex,
    JSONToKv,
    dehumanize,
    passFilter,
    isInFilters,
    getArrayCitations,
    uniqArray,
    isHex,
    getSeverity,
    basicSeverityLookup,
    getSeverityTerms,
    removeSeverityTerms,
    getDefaultSeverity,
    isInSubnet,
    maskToBits,
    validateIpv4,
    validateCidr,
    validateNetAndMask,
    addressToInt,
    intToAddress,
    getSubnetData,
    listHosts,
    substitute,
    getConfig,
    printObj,
    sendMetrics,
    sendEvents,
};
