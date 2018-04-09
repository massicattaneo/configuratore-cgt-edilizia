const Promise = require('./Promise');

module.exports = function Stream(additionalArgs, destroy) {
    const stream = {};
    const subjects = [];
    const filters = [];
    const context = {};
    let debounceDelay = 0;
    let isDebouncing = null;
    stream.emit = function (...args) {
        const promises = [];
        subjects.forEach(function (subscriptionsFire) {
            if (filters.length === 0 ||
                filters.filter(fn => fn.call(context, ...args.concat(additionalArgs))).length) {
                if (!isDebouncing) {
                    if (debounceDelay) {
                        isDebouncing = setTimeout(function () {
                            isDebouncing = null;
                        }, debounceDelay);
                    }
                    promises.push(subscriptionsFire(...args.concat(additionalArgs)));
                }
            }
        });
        return Promise.all(promises);
    };
    stream.subject = function () {
        const subject = {};
        const subscriptions = [];
        subjects.push(function (...args) {
            const promises = [];
            subscriptions.forEach((subscription) => {
                promises.push(subscription.call(context, ...args));
            });
            return Promise.all(promises);
        });
        subject.subscribe = function (callback) {
            subscriptions.push(callback);
            return subject;
        };
        subject.debounce = function (delay = 0) {
            debounceDelay = delay;
            return subject;
        };
        subject.filter = function (callback) {
            filters.push(callback);
            return subject;
        };
        subject.destroy = function () {
            filters.length = 0;
            subscriptions.length = 0;
            subjects.splice(subjects.indexOf(subject), 1);
            destroy();
        };
        subject.initContext = function (o) {
            Object.keys(o).forEach((key) => {
                context[key] = o[key];
            });
            return subject;
        };
        return subject;
    };
    return stream;
};
