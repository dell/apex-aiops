const listMax = 3;
const defaultSeverity = 1;

/**
 * Basic severity mappings
 * Add to add required
 */

const basicSeverityMap = {
    // CRITICAL
    critical: 5,
    fatal: 5,
    emergency: 5,
    down: 5,

    // MAJOR
    major: 4,
    important: 4,
    severe: 4,

    // MINOR
    minor: 3,

    // WARNING
    warning: 2,
    warn: 2,

    // INDETERMINATE
    unknown: 1,
    intermediate: 1,
    indeterminate: 1,
    informational: 1,
    info: 1,

    // CLEAR
    clear: 0,
    ok: 0,
    okay: 0,
    up: 0,
    normal: 0,
};

/**
 * Complex severity terms and assertions
 */

const severityTerms = [
    // -----------------------------------------------------------------------------
    //  Severtiy terms:
    //  A list of terms used to determine a seveirty
    // -----------------------------------------------------------------------------

    {
        // Critial
        severity: 5,
        name: 'critical',
        terms:
      [
          '\\S*fail(?:ure|ed)?',
          'down',
          'critical',
          'error(?:s)?',
          'not[\\s\\-_]*respon(?:sive|ding)?',
          'full',
          'stop(?:ped)?',
          'shutdown',
          '\\w*unavailable',
          'unable[\\s\\-_]?to',
          'unreachable',
          'missing',
          'inactive',
          'invalid',
          'unsupported',
          'disconnect(?:ed)?',
          'connection[\\s\\-_]*refused',
          'incident',
          'corrupt(?:ion|ed)?',
          'violation',
          'expire(?:d)?',
          'bad',
          'overload',
          'abnormal(?:ly)?',
          'flap(?:ping)?',
          'not[\\s\\-_]?successful',
          'emerg(?:ency)?',
          'off',
          'not[\\s\\-_]?operational',
          'destroy(?:ed)?',
          'not[\\s\\-_]?ok(?:ay)?',
          'anomaly',
          'out[\\s\\-_]?of[\\s\\-_]?space',
          'conflict',
          'rogue',
          'serious',
          'out[\\s\\-_]?of[\\s\\-_]?service',
          '(?:non|un)[\\s\\-_]?recoverable',
          'stopped',
          'compromised',
          'toobusy',
          'abovemax',
          'not[\\s\\-_]?running',
          'notup',
          'coredump',
          'too[\\s\\-_]?high',
          'out[\\s\\-_]*of[\\s\\-_]*memory',
          'severe',
          'fatal',
          'malfunction(?:ed|ing)?',
          'not[\\s\\-_]?listening',
      ],
        assertions: [
            '(?:above|over)(?=.*threshold)',
            'up(?=.*\\bdown)',
            'bgp(?=.*idle)',
            'inservice(?=.*\\boutofservice)',
            '(?:not|stopped)(?=.*\\bresponding)',
        ],
    },

    // Major

    {
        severity: 4,
        name: 'major',
        terms:
      [
          'degraded',
          'exceed(?:ed|s|ing){1}',
          'disable(?:d)?',
          'time(?:d)?[\\s\\-_]?out',
          'lost',
          'suspended',
          'problem',
          '(?!be)low',
          'defect',
          'offline',
          'incomplete',
          'busy',
          'discard(?:ing|ed)?',
          'major',
          'deadlock',
          'reject(?:ing|ed)?',
          'retrying',
          'threshold\\s?reached',
          'overdue',
          'notfound',
          'moderate',
          'outofsync',
          'overcommited',
          'toomany',
          'reboot(?:ed|ing)?',
          'unhealthy',
          '\\w+exception',
          'loss[\\s\\-_]?of',
          'not[\\s\\-_]?reliable',
          'cold[\\s\\-_]?start',
      ],
        assertions: [
            'low(?=.*\\bpower)',
            'power(?=.*\\blow)',
            'refused(?=.*\\bconnect)(?:ion)?',
            'abnormally(?=.*\\bterminated)',
            'rpd(?=.*\\bupdown)',
            'loss of protection',
            'limit(?=.*\\breached)',
            'topo(?:logy)?(=?.*\\bchange(d)?)',
            'low(?=.*\\bvoltage)',
            'voltage(?=.*\\blow)',
            'quota(?=.*\\breached)',
            'reached(?=.*\\b(?:capacity|limit))',
            '(?:high.*)\\b(?:utilization|loss|load|temperature)',
            '(?:utilization|loss|load|temperature)(?=.*\\bhigh(?:er)?)',
            'non(?=.*\\bcritical)',
            '(?:nearly|almost)(?=.*\\bfull)',
        ],
    },

    // Minor

    {
        severity: 3,
        name: 'minor',
        terms:
      [
          'spoof(?:ed)?',
          'not\\s?found',
          'den(?:y|ied)',
          '\\w*mismatch(?:ed)?',
          'deleted',
          'drop(?:ped|ping)?',
          'exited',
          'killed',
          'removed',
          'minor',
          'plugged\\s?out',
          'unexpected',
          'unmanaged',
          'inconsistent[\\s\\-_]?configuration',
          'invalid',
          'buildup',
          'not[\\s\\-_]?permit(?:(?:t)?ed|(?:t)?ing)?',
          'not[\\s\\-_]?grant(?:(?:t)?ed|(?:t)?ing)?',
          '(?:un|not)[\\s\\-_]?resolved',
      ],
        assertions: [
            'bandwidth(?=.*\\bchanged)',
            'modulation(?=.*\\bchanged)',
            'connection(?=.*\\bclosed)',
            'not(?=.*\\breceive)',
            'close(?:d|s)?(?=.*connection)',
            'could not be contacted',
            'blocked(?=.*\\btransmit[\\s\\-_]?queue)',
            'timing?[\\s\\-_]?out',
            'no(?=.*\\boffers)',
            'request(?=.*discarded)',
            'cef(?=.*\\busage)',
            'no .*could be contacted',
            'rate(?=.*limit(ed|ing)?)',
            '(?:index|name|mtu|address|interval)(?=.*\\bchanged)',
            'approaching(?=.*\\b(?:capacity|limit|quota))',
        ],
    },

    // Informational/warning

    {
        severity: 2,
        name: 'warning',
        terms:
      [
          'warning',
          'receive(?:d)?',
          '\\w*warn',
          'log(?:ged)?\\s*(?:in|out)',
          'not[\\s\\-_]?accepted',
          'update',
          'begin',
          'configured',
          'duplicate',
          'request(?:ing|ed)',
          'built',
          'teardown',
          '(?:re)?assigned',
          'notif(?:y|ied)',
          'quer(?:ying|ied)',
          'run[\\s\\-_]?parts',
          '(?:re)?synchroniz(?:e|ed|ing)',
          'renamed',
          'refreshed',
          '\\S*renew(?:lease)?',
          'transferred',
          'restarting',
          'repairing',
          'configchange',
          'expir(?:e|ing)',
          'rotat(?:e|ing)',
          'top(?=.*\\consumming)',

      ],
        assertions: [
            'too many (?=.*failures)',
            '(?:duplex|speed)(?=.*change(?:d)?)',
            'clock(?=.*\\bchanged)',
            'changed(?=.*\\bmanually)',
        ],
    },

    // Indeterminate

    {
        severity: 1,
        name: 'indeterminate',
        terms: [
            'last message repeated',
            'merge[\\s\\-_]?request',
            'unknown',
        ],
    },

    // Clear

    {
        severity: 0,
        name: 'clear',
        terms:
      [
          'clear(?:ed|ing)?',
          'ok(?:ay)?',
          'up(?!.*\\b(?:time|days|mins|secs))',
          'running',
          'succe(?:ss|ssfully|eded|ssful)?',
          'available',
          'active',
          '(?:re)?start(?:ed|up)?',
          'connect(ed)',
          '\\w*info',
          'enabled',
          'complete(?:d)?',
          'normal(?:ly)?',
          'information(?:al)?',
          'finished',
          'reachable',
          'online',
          'permit(?:(?:t)?ed|(?:t)?ing)?',
          'resume(?:d)?',
          'established',
          'operational',
          'restore(?:d)?',
          'resolved',
          'inserted',
          'alive',
          'grant(?:(?:t)?ed|(?:t)?ing)?',
          'recover(?:ed|able)',
          'passed',
          'resum(?:ed|ing)',
          'inservice',
          'plugged\\s?in',
          'belowmax',
          'clear[\\s\\-_]?notification',
          'repaired',
          'accepted',
      ],
        assertions: [
            'down(?=.*\\bup)',
            'below(?=.*threshold)',
            'outofservice(?=.*\\binservice)',
        ],
    },
];

/**
 * Is one of 'words' in 'text'
 * @param {string} text - text to test
 * @param {array} words - the words and regexs to test with
 */

function oneOf(text, words) {
    // Are any of the words in text - uses word boundaries
    if (!text || !Array.isArray(words) || words.length === 0) {
        return false;
    }
    const wordRe = new RegExp(`(\\b${words.join('\\b)|(\\b')}\\b)`, 'gi');
    return wordRe.test(text);
}

/**
 * Return the severity terms as a list
 * @param {number} severity - only get terms for the indicated severity
 */

function getSeverityTerms(severity = null) {
    const severityTokens = [];

    severityTerms.forEach((s) => {
        if (severity === null) {
            severityTokens.push(...s.terms);
        } else if (s.severity === severity) {
            severityTokens.push(...s.terms);
        }
    });
    return severityTokens;
}

/**
 * Remove all known severity terms from text.
 * @param {string} text - the text to remove from
 * @param {integer} severity - the severity to remove
 *    - This is optional, if left out all severity terms
 *    - from all severities will be remved.
 * This could be expensive (time) and overly greedy.
 */

function removeSeverityTerms(text = '', severity = null) {
    // Remove all know severity terms from a message.
    /* eslint-disable no-continue */

    if (!text) {
        return text;
    }

    const severityTokens = getSeverityTerms(severity);
    let words;
    let tmpText = text;

    for (let tIdx = 0; tIdx < severityTokens.length; tIdx += listMax) {
        words = severityTokens.slice(tIdx, tIdx + listMax);
        const startText = tmpText;

        try {
            const wordRe = new RegExp(`(\\b${words.join('\\b)|(\\b')}\\b)`, 'gi');
            tmpText = tmpText.replace(wordRe, '');
        } catch (replaceError) {
            tmpText = startText;
            continue;
        }
    }
    return tmpText;
}

/**
 * Speculitively generate a severity from the passed text.
 * common severity terms and phrases.
 * Last match wins for assertsions, first match wins for terms.
 *
 * @param {string} text - the string to test against.
 */

function getSeverity(text) {
    if (!text) {
        return defaultSeverity;
    }

    let severity = null;
    let list = [];
    let sev;
    let match = false;

    for (let sIdx = 0; sIdx < severityTerms.length; sIdx += 1) {
        sev = severityTerms[sIdx];

        if (sev.terms && sev.terms.length > 0) {
            for (let tIdx = 0; tIdx < sev.terms.length; tIdx += listMax) {
                list = sev.terms.slice(tIdx, tIdx + listMax);

                if (oneOf(text, list)) {
                    severity = sev.severity;
                    match = true;
                    break;
                }
            }
            if (match) {
                break;
            }
        }
    }

    // Look for assertions (lookahead phrases) for more accuracy (e.g. up followed by down).

    for (let asIdx = 0; asIdx < severityTerms.length; asIdx += 1) {
        sev = severityTerms[asIdx];

        if (sev.assertions && sev.assertions.length > 0) {
            for (let aIdx = 0; aIdx < sev.assertions.length; aIdx += listMax) {
                list = sev.assertions.slice(aIdx, aIdx + listMax);

                if (oneOf(text, list)) {
                    severity = sev.severity;
                    break;
                }
            }
        }
    }
    return severity !== null ? severity : defaultSeverity;
}

/**
 * A text based lookup for severity.
 * @param {string} severity - the severity string to lookup
 * @return {number} - the integer severity value
 */

function basicSeverityLookup(severity) {
    if (!severity) {
        return defaultSeverity;
    }

    return typeof basicSeverityMap[severity.toLowerCase()] !== 'undefined'
        ? basicSeverityMap[severity.toLowerCase()] : defaultSeverity;
}

/**
 * Return the default severity.
 */

function getDefaultSeverity() {
    return defaultSeverity;
}

/**
 * Export our functions
 */

module.exports = {
    getSeverity,
    basicSeverityLookup,
    getSeverityTerms,
    removeSeverityTerms,
    getDefaultSeverity,
};
