const Stream = require('./Stream');
const EventEmitter = require('./index');
const Promise = require('./Promise');

/**
 * @class StreamEmitter
 * @example
 * const streamEmitter = StreamEmitter();
 * @returns {object} a new stream emitter
 *  */
module.exports = function StreamEmitter() {
    const obj = EventEmitter();
    const streams = [];
    const emit = obj.emit;
    /**
     * fire an event
     * @method EventEmitter#emit
     * @param {string} eventName - the name of the event to fire
     * @param {object} param - some parameters to pass to subscribed callbacks
     * @returns {Promise} an promise that will resolve when all the events are executed
     * */
    obj.emit = function (eventName, param) {
        const promises = emit(eventName, param);
        streams.forEach(function (stream) {
            promises.push(stream.emit(eventName, param));
        });
        return Promise.all(promises);
    };
    /**
     * stream all the events
     * @method EventEmitter#stream
     * @param {Array} [additionalArgs] - optional additional arguments to pass to the stream
     * @returns {Object} - a stream object
     * */
    obj.stream = function (...additionalArgs) {
        const stream = Stream(additionalArgs, () => {
            streams.splice(streams.indexOf(stream), 1);
        });
        streams.push(stream);
        return stream.subject();
    };

    return obj;
};
