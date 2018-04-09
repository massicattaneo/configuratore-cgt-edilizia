import EventEmitter from '../../../gml-event-emitter/StreamEmitter';

export default function() {
    const error = EventEmitter();
    error.throw = function (name, params) {
        error.emit(name, params);
    };
    error.catch = function (additionalParams) {
        return error.stream(additionalParams);
    };

    return error;
}
