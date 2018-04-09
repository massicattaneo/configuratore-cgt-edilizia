/* eslint require-jsdoc: 'off' */
/* eslint arrow-body-style: 'off' */
/* eslint no-return-assign: 'off' */
/* eslint no-param-reassign: 'off' */
/* eslint prefer-rest-params: 'off' */
/* eslint no-eval: 'off' */
/* eslint no-debugger: 'off' */
/* eslint no-nested-ternary: 'off' */
const EventEmitter = require('../gml-event-emitter');

const Console = require('./Console');

function limit(countLimit) {
    let count = 0;
    return function mapObject(p) {
        if (typeof p === 'string') return p;
        if (!p) return p;
        return Object.keys(p)
            .map((k) => {
                return { key: k, value: p[k] };
            })
            .reduce((a, b) => {
                count++;
                a[b.key] = (b.value instanceof Object && count < countLimit) ?
                    mapObject(b.value) : b.value && b.value.toString ? b.value.toString() : '';
                return a;
            }, {});
    };
}


function Logger(obj, console) {
    const logger = {};
    const methods = {};

    Object.keys(obj).forEach(function (method) {
        if (obj[method] instanceof Function) {
            const old = obj[method];
            obj[method] = function (...params) {
                if (methods[method] && methods[method].debugBefore) debugger;
                const ret = old.apply(this, arguments);
                if (methods[method] && methods[method](method, params)) {
                    const returns = JSON.stringify(ret);
                    const parameters = JSON.stringify(limit(5)(params));
                    console.print(`CALLING ${method} -  PARAMS: ${parameters} - RETURNS: ${returns}`);
                }
                if (methods[method] && methods[method].debugAfter) debugger;
                return ret;
            };
        }
    });
    logger.log = (nm, callback = () => true) => {
        methods[nm] = callback;
        return logger;
    };
    logger.debugBefore = (nm, callback = () => true) => {
        callback.debugBefore = true;
        methods[nm] = callback;
        return logger;
    };
    logger.debugAfter = (nm, callback = () => true) => {
        callback.debugAfter = true;
        methods[nm] = callback;
        return logger;
    };

    return logger;
}

function Terminal(system, consoleFn) {
    const terminal = {};
    const monitored = {};
    const loggers = [];
    const stream = EventEmitter();

    const bConsole = Console(function (command) {
        const array = command.split(' ');
        if (command.substr(0, 7) === 'system.') {
            terminal.log(eval(command));
            return;
        }
        switch (array[0]) {
        case undefined:
            break;
        case 'reset':
            bConsole.clear();
            break;
        default:
            terminal[array[0]](...array.splice(1));
        }
    });
    bConsole.init();

    terminal.logger = function (obj) {
        if (loggers.indexOf(obj) === -1) {
            loggers.push(obj);
            obj.__logger = Logger(obj, bConsole);
        }
        return loggers[loggers.indexOf(obj)].__logger;
    };

    terminal.log = function (msg) {
        bConsole.print(msg);
    };

    terminal.monitor = function (name, obj) {
        monitored[name] = obj;
        Object.keys(obj).forEach(function (method) {
            if (obj[method] instanceof Function) {
                const old = obj[method];
                obj[method] = function (...args) {
                    obj[method].calls++;
                    return old(...args);
                };
                obj[method].calls = 0;
            }
        });
    };

    terminal.stats = function (objectName, fn) {
        const reduce = Object.keys(monitored).map(function (name) {
            return {
                name,
                stats: Object.keys(monitored[name]).map((method) => {
                    return { method, calls: monitored[name][method].calls };
                }).reduce((a, b) => {
                    a[b.method] = b.calls;
                    return a;
                }, {})
            };
        }).reduce((a, b) => {
            a[b.name] = b.stats;
            return a;
        }, {});
        bConsole.print((reduce[objectName][fn] !== undefined) ?
            `CALLS TO ${objectName}.${fn}: ${reduce[objectName][fn]}`
            : reduce[objectName]);
    };

    terminal.logStream = function (filter = () => true) {
        stream.stream()
            .filter(filter)
            .subscribe(function (fnName, params) {
                bConsole.print([fnName].concat(params));
            });
    };

    Object.keys(system).forEach((key) => {
        if (system[key] instanceof Function) {
            const old = system[key];
            system[key] = function (...args) {
                const ret = old(...args);
                const param = [...args];
                if (ret !== system) param.push(ret);
                stream.emit(key, param);
                return ret;
            };
        }
    });

    const old = window.console[consoleFn];
    window.console[consoleFn] = function (...args) {
        terminal.log(args.map(i => limit(4)(i)));
        old(...args);
    };

    return terminal;
}

module.exports = Terminal;
