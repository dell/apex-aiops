/**
 * Mapper Class
 * Provides a method to map an object values to a predefined macro map
 * Provides a method to substitute a macro based token with an object value
 */

/* eslint no-bitwise: ["error", { "allow": ["<<","&="] }] */
/* eslint-disable no-param-reassign */

const { Logger } = require('./Logger');
const {
    getObjectType,
    epochDate,
    isPopulatedList,
    deleteObjectKey,
    flattenObject,
    getArrayCitations,
    uniqArray,
} = require('./index.js');

const { basicSeverityLookup } = require('./severity');

/**
 * Class definition
 * @class
 * @classdesc The Mapper class - map objects to a macro map.
 * @property {object} map - the map associated with this instance
 * @property {object} results - the results of the last mapObject() call
 * @property {object} macros - the list of recognised macro functions
 *
 * @description A map is a list of anonymous objects, each will have attrbiutes
 * 'key' and 'value' where key is the output key name and value is the mapped
 * values from the source object.
 * e.g.
 * [
 *   { 'key' : 'name' , 'value' : '$(source.name)' }
 * ]
 *
 * Macros can be used, and added to as needed - a maco accepts
 * three arguments - the source object, the attribute name being
 * acted on, and the value from the source object.
 *
 */

class Mapper {
    /**
     * constructor
     */

    constructor(logger) {
        this.logger = logger || new Logger();
        this.map = undefined;
        this.results = undefined;
        const self = this;
        this.macros = {
            TO_INT(sourceObject, attrib, value) {
                // Basic parseInt.

                let convertedValue = parseInt(value, 10);
                if (!Number.isInteger(convertedValue)) {
                    self.logger.debug(`Mapper:: toInt conversion for '${value}' failed`);
                    convertedValue = null;
                }
                return convertedValue;
            },

            TO_NUM(sourceObject, attrib, value) {
                // parseFloat for any number.

                let convertedValue = parseFloat(value);
                if (Number.isNaN(convertedValue)) {
                    self.logger.debug(`Mapper:: toNum conversion for '${value}' failed`);
                    convertedValue = null;
                }
                return convertedValue;
            },

            TO_JSON(value) {
                // A JSON Parse.

                let convertedValue;
                try {
                    convertedValue = JSON.parse(value);
                } catch (e) {
                    self.logger.debug(`Mapper:: toJson conversion failed: ${e}`);
                    convertedValue = null;
                }
                return convertedValue;
            },

            TO_DATE(sourceObject, attrib, value) {
                // Convert an epcoh (or any number) to an ISO date format.

                let convertedValue;
                if (/^[0-9]+$/.test(value)) {
                    const epoch = parseInt(value, 10);
                    if (typeof epoch === 'number' && !Number.isNaN(epoch)) {
                        const conDate = new Date(0);
                        conDate.setUTCSeconds(epoch);
                        convertedValue = conDate.toISOString();
                    } else {
                        self.logger.debug(`Mapper:: toDate conversion for '${value}' failed`);
                        convertedValue = null;
                    }
                } else {
                    self.logger.debug(`Mapper:: toDate value '${value}' was not a number`);
                    convertedValue = null;
                }
                return convertedValue;
            },

            TO_UTC(sourceObject, attrib, value) {
                // Convert an ISO date to UTC seconds.
                // if the date object is invalid, return moog_now.

                let convertedValue;
                const date = new Date(value);

                // If the date did not parse - check for
                // a NaN (a NaN is not equal to itself).
                /* eslint-disable no-self-compare */

                if (date.getTime() !== date.getTime()) {
                    convertedValue = null;
                } else {
                    convertedValue = date.getTime();
                }
                return convertedValue;
            },

            TO_STRING(sourceObject, attrib, value) {
                // Stringify - but only if the value is an object.

                let convertedValue = value;
                if (getObjectType(value) === 'object' || getObjectType(value) === 'array') {
                    try {
                        convertedValue = JSON.stringify(value);
                    } catch (e) {
                        self.logger.debug(`Mapper:: toValueString (toString macro) conversion failed: ${e}`);
                        convertedValue = null;
                    }
                }
                if (typeof value === 'number' || typeof value === 'boolean') {
                    convertedValue = value.toString();
                }
                return convertedValue;
            },

            TO_BOOLEAN(sourceObject, atrrib, value) {
                // Convert common ture/false values to a true boolean.

                let convertedValue;

                if (typeof value === 'boolean') {
                    return value;
                }
                if (typeof value === 'string' && value.toLowerCase() === 'true') {
                    convertedValue = true;
                }
                if (typeof value === 'string' && value.toLowerCase() === 'false') {
                    convertedValue = false;
                }
                if (typeof value === 'string' && value.toLowerCase() === 'yes') {
                    convertedValue = true;
                }
                if (typeof value === 'string' && value.toLowerCase() === 'no') {
                    convertedValue = false;
                }
                // loose integer check.
                if (value === '1' || value === 1) {
                    convertedValue = true;
                }
                if (value === '0' || value === 0) {
                    convertedValue = false;
                }

                return typeof convertedValue === 'boolean' ? convertedValue : null;
            },

            TO_LIST(sourceObject, attrib, value) {
                // Convert an array to a CSV

                let convertedValue;
                if (isPopulatedList(value)) {
                    convertedValue = value.join(',');
                } else {
                    self.logger.debug("Mapper: TO_LIST 'value' was not a populated Array");
                    convertedValue = null;
                }
                return convertedValue;
            },

            SEVERITY(sourceObject, attrib, value) {
                // Lookup a severity from a simple list of words

                return basicSeverityLookup(value);
            },

            FLATTEN(sourceObject, attrib, value) {
                // Convert a deep object to a flat object.
                const valueType = getObjectType(value);
                let convertedValue;
                if (valueType === 'object' || valueType === 'array') {
                    convertedValue = flattenObject(value);
                } else {
                    self.logger.debug('Mapper: TO_TAGS \'value\' was not an object or array');
                    convertedValue = null;
                }
                return convertedValue;
            },

            TOP(sourceObject, attrib, value) {
                // Most common value from a list (string).
                let convertedValue;
                if (isPopulatedList(value)) {
                    const citations = getArrayCitations(value);
                    convertedValue = citations && citations.topMember ? citations.topMember : null;
                } else {
                    self.logger.debug('Mapper: TOP \'value\' was not a populated Array');
                    convertedValue = null;
                }
                return convertedValue;
            },

            UNIQ(cevent, attrib, value) {
                // Uniquify a list.
                let convertedValue;
                if (isPopulatedList(value)) {
                    convertedValue = uniqArray(value);
                } else {
                    self.logger.debug('Mapper: UNIQ \'value\' was not a populated Array');
                    convertedValue = null;
                }
                return convertedValue;
            },

            FIRST(cevent, attrib, value) {
                // Return the first item in a sorted list
                let convertedValue;
                if (isPopulatedList(value)) {
                    const sorted = value.sort();
                    [convertedValue] = sorted;
                } else {
                    self.logger.debug('Mapper: FIRST \'value\' was not a populated Array');
                    convertedValue = null;
                }
                return convertedValue;
            },

        };
    }

    /**
     * Set the map associated with this instance.
     * @param {array} map - the map object, a list of valid entries.
     */

    setMap(map) {
        if (isPopulatedList(map)) {
            map.forEach((i) => {
                if (!i.key || typeof i.value === 'undefined') {
                    throw new Error('A map item is expected to have both a `key` and `value` elements');
                }
            });
            this.map = map;
        } else {
            throw new Error('A map is expected to be a list of items');
        }
        return this;
    }

    /**
     * Set the results of the last mapObject() call
     * @param {object} mappedValues - the results object
     */

    setResult(mappedValues) {
        this.results = mappedValues;
        return this;
    }

    /**
     * Get the results of the last mapObject() call
     * @returns {object} mappedValues - the results object
     */

    getResult() {
        return this.results;
    }

    /**
     * Add a macro to this instance
     * @param {string} macroName - the macro name (will be converted to uppercase)
     * @param {function} macroFunction - the function that will be called to process
     * the macro.
     */

    addMacro(macroName, macroFunction) {
        if (typeof macroFunction === 'function') {
            this.macros[macroName.toUpperCase()] = macroFunction;
        } else {
            throw new Error('Expected a function to be passed to `addMacro`');
        }
        return this;
    }

    /**
     *  Perform a maco based substitution.
     * @param {object} sourceObject  - the soruce object to take values from
     * @param {string} inputString - the string to substitute values in (macros allowed)
     * @param {string|number|object} defaultValue - the default to use if the source does
     * @param {boolean} failSafe - if true, the orifinal value will be kept when substitution fails
     * not contain a value.
     * @returns {string|object} - the substituted string or if TO_JSON() is used, the object.
     */

    substitute(sourceObject, inputString, defaultValue, failSafe) {
        // If the inputString is not string, return it.

        if (getObjectType(inputString) !== 'string') {
            return inputString;
        }

        // initialise overflow if not allready defined
        if (typeof this.overflow === 'undefined') {
            try {
                this.overflow = JSON.parse(JSON.stringify(sourceObject));
            } catch (e) {
                this.logger.info(`Failed to parse sourceObject: ${e.message}`);
                return inputString;
            }
        }

        // Evaluate the macros in the string.
        // Valid nested macros are:

        // $TO_JSON(...)
        // This will be evaluated last after all other substitutions.

        let outputString = inputString;
        let toJson = false;
        let partialMap = false;

        if (/^\s*\$TO_JSON\(.*\)\s*$/.test(inputString)) {
            toJson = true;
            this.logger.debug('Mapper: Enclosing JSON macro found, will convert once all substitutions made.');
            outputString = outputString.replace(/\s*\$TO_JSON\(/, '').replace(/\)\s*$/, '');
        }

        const validMacros = Object.keys(this.macros);

        if (!validMacros || !isPopulatedList(validMacros)) {
            this.logger.info('Mapper: No valid macros found');
            return inputString;
        }

        const validMacroReString = validMacros.join('|');
        const macroReString = `(?:\\$(?=(?:${validMacroReString})|\\())((?:(?:${validMacroReString})\\()|\\()([:\\/\\/\\w\\.\\-\\_\\[\\"\\]\\s\\+]+?)(?:\\))`;
        const macroRe = new RegExp(macroReString, 'g');
        const macroTestRe = new RegExp(macroReString, 'g');

        // Iterate and extract macros.
        // Macros are always $<MACRO>(<attribute>);

        const macroMatches = [...inputString.matchAll(macroRe)];

        macroMatches.forEach((macroData) => {
            const macroString = macroData[0];
            const macro = macroData[1].replace(/\(/, '');
            const attribute = macroData[2].trim();
            let sourceValue = null;

            // Are we going to try and read a value from a config file ?

            if (attribute === 'moog_now') {
                sourceValue = epochDate();
            } else if (/^\[\s*\]/.test(attribute) || /^{\s*}$/.test(attribute)) {
                this.logger.debug('Mapper: Using an empty JSON object');
                sourceValue = attribute;
            } else {
                // Get the sourceObject value for the attribute.
                sourceValue = this.utils.getObjectValue(sourceObject, attribute);
                deleteObjectKey(this.overflow, attribute);
            }

            if (typeof sourceValue === 'undefined' && typeof defaultValue !== 'undefined' && defaultValue !== null) {
                this.logger.debug(`Mapper: Using default value ${defaultValue} for ${attribute} as no value was found`);
                if (defaultValue === 'moog_now') {
                    sourceValue = epochDate();
                } else if (macroTestRe.test(defaultValue)) {
                    sourceValue = this.substitute(sourceObject, defaultValue, '');
                } else {
                    sourceValue = defaultValue;
                }

                if (/^("|'){2}$/.test(defaultValue)) {
                    this.logger.debug('Mapper: Using an empty string');
                    sourceValue = '';
                }
            }

            // We have a value, now do we need to run a macro on this.
            // The macro from the regex will be either an empty string or
            // a valid macro name.

            if (typeof sourceValue === 'undefined' && failSafe) {
                // In failSafe mode, keep original on no match & set partialMap flag
                sourceValue = macroString;
                partialMap = true;
            } else if (macro && typeof this.macros[macro] === 'function' && macro.toLowerCase() !== 'to_json') {
                this.logger.debug(`Mapper: Running ${macro} on ${sourceValue}`);
                const macroValue = this.macros[macro](sourceObject, attribute, sourceValue);
                if (macroValue === null) {
                    this.logger.debug(`Mapper: Macro ${macro} returned null for value ${sourceValue} for attribute ${attribute} leaving as the original value`);
                } else {
                    this.logger.debug(`Mapper: Macro ${macro} returned ${macroValue} for value ${sourceValue} for attribute ${attribute}`);
                    sourceValue = macroValue;
                }
            }

            // Globally replace the macroString with the value in the output string.
            // but only if the string is a compound (i.e. the inputString is not the
            // full macro string.

            if (macroString !== inputString) {
                if (getObjectType(sourceValue) === 'array') {
                    // The value needs to be stringified.
                    try {
                        sourceValue = JSON.stringify(sourceValue);
                    } catch (e) {
                        this.logger.warn(`Mapper: failed to stringiify an object for a compound value: ${e}`);
                        sourceValue = '[]';
                    }
                }
                if (getObjectType(sourceValue) === 'object') {
                    try {
                        sourceValue = JSON.stringify(sourceValue);
                    } catch (e) {
                        this.logger.warn(`Mapper: failed to stringiify an object for a compound value: ${e}`);
                        sourceValue = '{}';
                    }
                }
                outputString = outputString.replace(macroString, sourceValue);
            } else {
                outputString = sourceValue;
            }
        });

        // After all macro substitution, see if we need to to a JSON conversion.

        if (toJson && !partialMap) {
            this.logger.debug(`Mapper: Converting to JSON : ${outputString}`);
            const jsonObj = this.macros.TO_JSON(outputString);
            if (!jsonObj) {
                this.logger.debug('Mapper: TO_JSON failed - using an empty object.');
                outputString = {};
            } else {
                outputString = jsonObj;
            }
        }

        if (toJson && partialMap) {
            // In failSafe mode and not fully mapped, so won't evaluate enclosing macro
            outputString = `$TO_JSON(${outputString})`;
        }

        return outputString;
    }

    /**
     * Map a source object to a macro map.
     * @param {object} sourceObject - the object to take values from
     * @param {boolean} flat - default false.
     *
     * Flat determines if the returned object will use depth for
     * dotted notation source keys.
     * e.g. if 'flat' is true, a key 'scope.query' would return
     * {
     *    'scope.query' : ...
     * }
     *
     * If 'flat' is false, a key 'scope.query'would return
     * {
     *   'scope' : {
     *      'query' : ....
     *    }
     * }
     */

    mapObject(sourceObject, flat = false) {
        // If flat then return a flat object
        // else return a deep object
        const mappedValues = {};

        // initialise overflow
        try {
            this.overflow = JSON.parse(JSON.stringify(sourceObject));
        } catch (e) {
            this.logger.info(`Failed to parse sourceObject: ${e.message}`);
            this.setResult(mappedValues);
            return this.results;
        }

        for (let atIdx = 0; atIdx < this.map.length; atIdx += 1) {
            const attribute = this.map[atIdx];

            if (getObjectType(attribute) !== 'object' || !attribute.key || typeof attribute.value === 'undefined') {
                this.logger.error('Mapper: expected an object with a `key` and `value` keys');
                this.setResult(mappedValues);
                return this.results;
            }

            const itemName = attribute.key;
            const itemRule = attribute.value;
            const defaultValue = typeof attribute.default !== 'undefined' ? attribute.default : null;

            // Only allow a default value for something that is a single macro

            const itemValue = this.substitute(sourceObject, itemRule, defaultValue);

            // If we want this as an object
            // Return an object or a flat key:value pair.

            if (flat) {
                mappedValues[itemName] = itemValue;
            } else {
                this.utils.addObject(mappedValues, itemName, itemValue, true);
            }
            this.logger.debug(`Adding: ${itemName} = ${itemValue}`);
        }
        this.setResult(mappedValues);
        return this.results;
    }

    /**
     * Return a string of substituted values.
     * @param {array} items - the list of items to substitute
     * @return {array} - the substituted list.
     */

    substituteList(sourceObject, items) {
        const substitutedItems = [];

        if (!isPopulatedList(items)) {
            this.logger.warn('substituteList: Expected a list of items to replace');
            return [];
        }

        const validMacros = Object.keys(this.macros);
        if (!validMacros || !isPopulatedList(validMacros)) {
            this.logger.info('Mapper: No valid macros found');
            return substitutedItems;
        }
        const validMacroReString = validMacros.join('|');
        const macroReString = `(?:\\$(?=(?:${validMacroReString})|\\())((?:(?:${validMacroReString})\\()|\\()([:\\/\\/\\w\\.\\-\\_\\[\\"\\]\\s\\+]+?)(?:\\))`;
        const macroRe = new RegExp(macroReString);

        items.forEach((i) => {
            if (macroRe.test(i)) {
                substitutedItems.push(this.substitute(sourceObject, i));
            } else {
                substitutedItems.push(this.substitute(sourceObject, `$(${i})`));
            }
        });
        return substitutedItems;
    }

    /**
     * Get overflow after call to mapObject()
     * @return {object} - an object containing unmapped keys
     */

    getOverflow() {
        return this.overflow || {};
    }
}

/**
 * Export the class.
 */

module.exports = {
    Mapper,
};
