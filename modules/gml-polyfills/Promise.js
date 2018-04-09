/**
 * A simple polyfill for the ES6 promise
 * @constructor
 * @param {Function} resolver - the resolver of the promise as in ES6
 */
const P = function (resolver) {
    const promise = this;
    const em = EventEmitter();
    const resolved = { done: false, value: undefined };
    const rejected = { done: false, value: undefined };
    promise.then = (fn) => {
        if (resolved.done) fn(resolved.value);
        else if (!rejected.done && !resolved.done) em.on('resolve', fn);
    };
    promise.catch = (fn) => {
        if (rejected.done) fn(rejected.value);
        else if (!rejected.done && !resolved.done) em.on('reject', fn);
        return promise;
    };
    resolver((arg) => {
        resolved.value = arg;
        resolved.done = true;
        em.emit('resolve', arg);
        em.clear();
    }, (arg) => {
        rejected.value = arg;
        rejected.done = true;
        em.emit('reject', arg);
        em.clear();
    });
};
P.resolve = function (a) {
    if (window.Promise) return window.Promise.resolve(a);
    return new P(function (resolve) {
        resolve(a)
    })
};
/**
 * @param {Array} array - an array of promises
 * @returns {Object} - an ES6 style promise
 * */
P.all = function (array = []) {
    if (window.Promise) return window.Promise.all(array);
    let counter = 0;
    if (!array.length) return new P(res => res());
    const results = [];
    return new P(function (res, rej) {
        const em = EventEmitter();
        em.on('complete-one', function ({value, index}) {
            results[index] = value;
            if (++counter === array.length) {
                res(results);
                em.clear();
            }
        });
        em.on('reject-one', function () {
            rej();
            em.clear();
        });
        array.forEach(function (promise, index) {
            if (promise.then) {
                promise
                    .then(value => em.emit('complete-one', {value, index}))
                    .catch(() => em.emit('reject-one'));
            } else {
                em.emit('complete-one', {index});
            }
        });
    });
};

window.Promise = window.Promise || P;
