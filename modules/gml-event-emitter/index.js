/**
 * @class EventEmitter
 * @example
 * const eventEmitter = EventEmitter();
 * @returns {object} a new event emitter
 *  */
module.exports = function EventEmitter() {
    const events = {};
    const obj = {};
    const all = [];
    /**
     * subscribe to an event
     * @method EventEmitter#on
     * @param {string} eventName - the name of the event to subscribe on
     * @param {function} callback - the callback to call on the event firing
     * @returns {function} a function to remove(off) the listener
     * */
    obj.on = function (eventName, callback) {
        events[eventName] = events[eventName] || [];
        events[eventName].push(callback);
        return () => obj.off(eventName, callback);
    };
    /**
     * unsubscribe to an event
     * @method EventEmitter#off
     * @param {string} eventName - the name of the event to unsubscribe
     * @param {function} callback - the callback to unsubscribe
     * @returns {undefined}
     * */
    obj.off = function (eventName, callback) {
        events[eventName].splice(events[eventName].indexOf(callback), 1);
    };
    /**
     * clear all the events
     * @method EventEmitter#clear
     * @returns {undefined}
     * */
    obj.clear = function () {
        Object.keys(events).forEach(function (eventName) {
            events[eventName].length = 0;
            delete events[eventName];
        });
        all.length = 0;
    };
    /**
     * fire an event
     * @method EventEmitter#emit
     * @param {string} eventName - the name of the event to fire
     * @param {object} param - some parameters to pass to subscribed callbacks
     * @returns {Array} an array containing all the returned values from the events called
     * */
    obj.emit = function (eventName, param) {
        const values = [];
        events[eventName] && events[eventName].forEach(callback => values.push(callback(param)));
        all.forEach(function (callback) {
            values.push(callback(eventName, param))
        });
        return values;
    };

    /**
     * subscribe to all events
     * @method EventEmitter#all
     * @param {function} callback - the callback to call on the event firing
     * @returns {function} a function to remove(off) the listener
     * */
    obj.all = function (callback) {
        all.push(callback);
        return () => all.splice(all.indexOf(callback), 1);
    };

    return obj;
};
