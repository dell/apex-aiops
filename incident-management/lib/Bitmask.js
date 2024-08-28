/**
 * Bitmask type for Moogsoft Metrics
 *
 * @module Bitmask
 */
class Bitmask {
    /**
     * Constructor
     */
    constructor() {
        this.keys = undefined;
        this.values = undefined;
    }

    /**
     * Set the keys (or labels) for
     * each bit in the Bitmask
     * @param {Array} keys an array of string keys
     */
    setKeys(keys) {
        this.keys = keys;
        return this;
    }

    /**
     * Set the bits in the Bitmask
     * @param {*} values an array of boolean values
     */
    setValues(values) {
        this.values = values;
        return this;
    }

    /**
     * Appends a key-value pair to the Bitmask
     *
     * @param {String} key the string key
     * @param {Boolean} value the boolean value
     */
    addValue(key, value) {
        if (!this.keys || this.keys === undefined) this.keys = [];
        if (!this.values || this.values === undefined) this.values = [];

        this.keys.push(key);
        this.values.push(value);
        return this;
    }

    /**
     * Validates a Bitmask type, enforcing
     * an equal number of keys and values, as well as types.
     *
     * @throws {Error} if the Bitmask is malformed
     */
    validate() {
        if (Array.isArray(this.keys) && Array.isArray(this.values)
            && this.keys.length > 0 && this.keys.length === this.values.length) {
            const hasNonString = this.keys.some((e) => typeof e !== 'string');
            if (hasNonString) throw new Error('Bitmask `keys` must be strings');

            const hasNonBool = this.values.some((e) => typeof e !== 'boolean');
            if (hasNonBool) throw new Error('Bitmask `values` must be booleans');
        } else {
            throw new Error('A Bitmask `value` object must contain `keys` and `values` lists of equal length');
        }
    }
}

module.exports = {
    Bitmask,
};
