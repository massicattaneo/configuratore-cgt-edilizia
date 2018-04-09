Function.prototype.curry = function () {
    const fn = this;
    const args = arguments;
    if (fn.length === args.length) {
        return fn(...args)
    } else {
        return function () {
            return fn.curry(...args, ...arguments);
        }
    }
};

Function.prototype.partial = function () {
    const args = arguments;
    const self = this;
    return function () {
        return self(...args, ...arguments);
    }
};


Function.prototype.signatureOrder = function () {
    const order = [...arguments];
    const self = this;
    return function () {
        const args = [...arguments];
        return self(...order.map(index => args[index]));
    }
};

Function.prototype.compose = function (fn2) {
    const fn1 = this;
    return function () {
        return fn2(fn1(...arguments))
    }
};

Function.prototype.filter = function (filter) {
    const self = this;
    return function (callback) {
        function toRemove() {
            if (filter(...arguments)) {
                return callback(...arguments)
            }
        }

        return self(toRemove) || toRemove;
    }
};

Function.prototype.debounce = function (time) {
    const self = this;
    let first = true;
    return function (callback) {
        let start = Date.now();

        function toRemove() {
            if (first || (Date.now() - start) > time) {
                start = Date.now();
                first = false;
                return callback(...arguments);
            }
        }

        self(toRemove);
        return toRemove;
    }
};

Function.prototype.debouncePromise = function () {
    const self = this;
    return function (callback) {
        let can = true;
        function toRemove() {
            if (can) {
                can = false;
                return callback(...arguments).then(function (a) {
                    can = true;
                    return a;
                });
            }
        }
        self(toRemove);
        return toRemove;
    }
};

Function.prototype.queue = function () {
    const self = this;
    return function (callback) {
        let queue = [], index = 0, running = false;

        function run() {
            if (!running && index < queue.length) {
                running = true;
                queue[index]().then(function () {
                    running = false;
                    index++;
                    run()
                })
            }
        }

        function toRemove() {
            const args = arguments
            queue.push(() => callback(...args));
            run();
        }

        self(toRemove);
        return toRemove;
    }
};

Function.prototype.stack = function () {
    const self = this;
    return function (callback) {
        let stack = [], index = 0;

        function run() {
            if (index < stack.length) {
                return stack[index++]();
            }
        }

        function toRemove() {
            const args = arguments;
            stack.push(() => callback(...args, run));
            if (stack.length === 1) run();
        }

        self(toRemove);
        return toRemove;
    }
};

Function.prototype.map = function (map) {
    const self = this;
    return function (callback) {
        function toRemove() {
            return callback(...map(...arguments))
        }
        return self(toRemove) || toRemove;
    }
};

Function.prototype.subscribe = function (callback) {
    return this(callback);
};

Function.identity = function (fn) {
    return fn();
};

Function.wrap = function (value) {
    return function () {
        return value;
    }
};