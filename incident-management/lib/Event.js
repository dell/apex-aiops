/**
 * Event class for sending events from a Collector Exec 
 * @module Event
 */
/* eslint camelcase: ["error", {allow: ["utc_offset","dedupe_key", "manager_id"]}] */

const SEVERITIES = ['clear', 'unknown', 'minor', 'warning', 'major', 'critical'];

/**
 * An Event sent upstream by the collector for processing in Express
 *
 * @property {String} severity One of INDETERMINATE, MINOR, WARNING, MAJOR, CRITICAL
 * @property {String} source The source of the event, which could be something like a hostname,
 *                 a service name, etc
 * @property {String} check The check that failed to generate this event, for example "cpu load"
 * @property {String} description A description of the event
 * @property {Number} time The timestamp of the event, if omitted defaults to the current time
 * @property {String} utc_offset The UTC offset of the data, for example +01:00,
 *                 defaults to the current TZ
 * @property {String} dedupe_key [Optional] The deduplication key of this event,
 * used when processing into an Incident
 * @property {String} manager [Optional] The manager of this event
 * @property {Array} service [Optional] An array of services impacted by this event
 * @property {String} alias [Optional] An alias for this event
 * @property {String} clazz [Optional] The class of this event,
 *                 for example Storage, AWS, Network, etc
 * @property {Object} tags [Optional] Key-value pairs of metadata for the event
 */
class Event {
    /**
     * Constructor
     */
    constructor() {
        this.severity = undefined;
        this.source = undefined;
        this.check = undefined;
        this.description = undefined;
        this.time = undefined;
        this.utc_offset = undefined;
        this.dedupe_key = undefined;
        this.manager = undefined;
        this.service = undefined;
        this.alias = undefined;
        this.class = undefined;
        this.tags = undefined;
        this.manager_id = undefined;
        this.location = undefined;
        this.dataType = 'moogEvent';
    }

    /**
     * The severity of the event, must be one of: INDETERMINANT, MINOR, WARNING, MAJOR, or CRITICAL
     * @param {String} sev
     */
    setSeverity(sev) {
        if (typeof sev === 'string') {
            this.severity = sev.toLowerCase();
        } else {
            this.severity = sev;
        }

        return this;
    }

    /**
     * The source of the event
     * @param {String} source
     */
    setSource(source) {
        this.source = source;
        return this;
    }

    /**
     * The check of the event
     * @param {String} check
     */
    setCheck(check) {
        this.check = check;
        return this;
    }

    /**
     * Add a description to the event
     * @param {String} desc
     */
    setDescription(desc) {
        this.description = desc;
        return this;
    }

    /**
     * Set the timestamp of the event, defaults to the current time
     * @param {Number} ts
     */
    setTime(ts) {
        this.time = ts;
        return this;
    }

    /**
     * Set the UTC offset for the event, such as -01:00, defaults to the current timezone offset
     * @param {String} utc
     */
    setUtcOffset(utc) {
        this.utc_offset = utc;
        return this;
    }

    /**
     * Set the dedupe key for the event
     * @param {String} dedupe
     */
    setDedupeKey(dedupe) {
        this.dedupe_key = dedupe;
        return this;
    }

    /**
     * Sets the manager for the event
     * @param {String} manager
     */
    setManager(manager) {
        this.manager = manager;
        return this;
    }

    /**
     * Sets an array of services impacted by the event
     * @param {Object} service
     */
    setService(service) {
        if (!Array.isArray(this.service)) {
            this.service = [];
        }
        this.service.push(service);
        return this;
    }

    /**
     * Sets an array of services impacted by the event
     * @param {Array} services
     */
    setServices(services) {
        this.service = services;
        return this;
    }

    /**
     * Sets the alias of the event
     * @param {String} alias
     */
    setAlias(alias) {
        this.alias = alias;
        return this;
    }

    /**
     * Sets the class of the event
     * @param {String} clazz
     */
    setClass(clazz) {
        this.class = clazz;
        return this;
    }

    /**
     * Sets the tags for this event
     * @param {Object} tags
     */
    setTags(tags) {
        this.tags = tags;
        return this;
    }

    /**
     * Sets a tag for this event
     * @param {String} key
     * @param {String} value
     */
    setTag(key, value) {
        if (typeof this.tags === 'undefined') {
            this.tags = {};
        }
        this.tags[key] = value;
        return this;
    }

    /**
     * Populate an event from an object with the same key names,
     * @param {object} object - the object to create the event with.
     */

    static from(sourceObject) {
        const event = new Event();
        if (typeof sourceObject.severity !== 'undefined') {
            event.setSeverity(sourceObject.severity);
        }
        if (typeof sourceObject.source !== 'undefined') {
            event.setSource(sourceObject.source);
        }
        if (typeof sourceObject.check !== 'undefined') {
            event.setCheck(sourceObject.check);
        }
        if (typeof sourceObject.description !== 'undefined') {
            event.setDescription(sourceObject.description);
        }
        if (typeof sourceObject.time !== 'undefined') {
            event.setTime(sourceObject.time);
        }
        if (typeof sourceObject.utc_offset !== 'undefined') {
            event.setUtcOffset(sourceObject.utc_offset);
        }
        if (typeof sourceObject.dedupe_key !== 'undefined') {
            event.setDedupeKey(sourceObject.dedupe_key);
        }
        if (typeof sourceObject.dedup_key !== 'undefined') {
            event.setDedupeKey(sourceObject.dedup_key);
        }
        if (typeof sourceObject.manager !== 'undefined') {
            event.setManager(sourceObject.manager);
        }
        if (typeof sourceObject.service !== 'undefined') {
            event.setServices(sourceObject.service);
        }
        if (typeof sourceObject.alias !== 'undefined') {
            event.setAlias(sourceObject.alias);
        }
        if (typeof sourceObject.class !== 'undefined') {
            event.setClass(sourceObject.class);
        }
        if (typeof sourceObject.tags !== 'undefined') {
            event.setTags(sourceObject.tags);
        }
        return event;
    }

    validate() {
        if (this.severity == null) {
            throw new Error('`severity` must be set in an Event');
        }

        if (typeof this.severity === 'string' && !SEVERITIES.includes(this.severity)) {
            throw new Error(`string \`severity\` must be set to one of [${SEVERITIES}]`);
        } else if (typeof this.severity === 'number' && (!Number.isInteger(this.severity) || this.severity > 5 || this.severity < 0)) {
            throw new Error('numeric `severity` must be one of [0, 1, 2, 3, 4, 5]');
        } else if (typeof this.severity !== 'string' && typeof this.severity !== 'number') {
            throw new Error(`\`severity\` must either be a number from 0 to 5 or one of [${SEVERITIES}]`);
        }

        if (this.source == null || typeof this.source !== 'string' || this.source === '') {
            throw new Error('`source` must be set to a non-empty string');
        }

        if (this.check == null || typeof this.check !== 'string' || this.check === '') {
            throw new Error('`check` must be set to a non-empty string');
        }

        if (this.description == null || typeof this.description !== 'string' || this.description === '') {
            throw new Error('`description` must be set to a non-empty string');
        }

        if (this.time != null && typeof this.time !== 'number') {
            throw new Error('`time` must be a number');
        }

        if (this.utc_offset != null && typeof this.utc_offset !== 'string') {
            throw new Error('`utf_offset` must be a non-empty offset string if supplied, such as +08:00');
        }

        if (this.dedupe_key != null && typeof this.dedupe_key !== 'string') {
            throw new Error('`dedupe_key` must be a non-empty string if supplied');
        }

        if (this.manager != null && typeof this.manager !== 'string') {
            throw new Error('`manager` must be a non-empty string if supplied');
        }

        if (this.service != null) {
            if (!Array.isArray(this.service) || this.service.length === 0) {
                throw new Error('`service` must be a non-empty array of strings');
            }

            this.service.forEach((val) => {
                if (typeof val !== 'string') {
                    throw new Error(`Entry in service list ${val} not a string`);
                }
            });
        }

        if (this.alias != null && typeof this.alias !== 'string') {
            throw new Error('`alias` must be a non-empty string if supplied');
        }

        if (this.class != null && typeof this.class !== 'string') {
            throw new Error('`class` must be a non-empty string if supplied');
        }

        if (this.tags != null) {
            if (this.tags.constructor !== {}.constructor) {
                throw new Error('`tags` must be a valid JSON object');
            }
        }
    }
}

module.exports = {
    Event,
};
