/**
 *
 * Simple Logger, extend as needed
 * Logging will be to stderr to avoid 
 * polluting stdout with debug.
 * stdout should be used for Event or Metric
 * output only. 
 *
 * Any Collector Exec source should have 
 * 
 * include_stderr : false
 * 
 * in the exec source config.
 *
 */

class Logger {

    constructor(debugState) {
        this.debugOn = typeof debugState === 'boolean' ? debugState : false;
    }

    setDebug(debugState) {
        this.debugOn = typeof debugState === 'boolean' ? debugState : false;
    }

    /**
     * info, debug, warn, error, fatal, log levels.
     */

    static now() {
        return new Date(Date.now()).toISOString();
    }
    
    info(msg) {
        process.error.write(`${this.constructor.now()} : INFO  : ${msg}\n`);
    }

    debug(msg) {
        if (this.debugOn) {
            process.error.write(`${this.constructor.now()} : DEBUG : ${msg}\n`);
        }
    }

    warn(msg) {
        process.error.write(`${this.constructor.now()} : WARN  : ${msg}\n`);
    }

    error(msg) {
        process.error.write(`${this.constructor.now()} : ERROR : ${msg}\n`);
    }

    fatal(msg, exitCode = 1) {
        process.stderr.write(`${this.constructor.now()} : FATAL : ${msg}\n`);
        process.exit(exitCode);
    }

    /**
     * Print a message without a level or date.
     */

    static logmsg(msg) {
        process.error.write(`${msg}\n`);
    }

    static printObj(obj) {
        process.error.write(`${JSON.stringify(obj,null,4)}\n`);
    }
}

module.exports = {
    Logger,
};
