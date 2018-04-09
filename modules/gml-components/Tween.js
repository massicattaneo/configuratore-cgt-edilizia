import EventEmitter from '../gml-event-emitter/index';

function getTween(keyframes, duration, timestamp) {
    let number = (timestamp % duration) / duration * 100;
    const perc = parseFloat(number.toFixed(1));
    return keyframes[Math.min(perc * 10, 999)];
}

function Runner(keyframes, duration, times, context) {
    const em = EventEmitter();
    let counter = 0;
    let completed = false;
    let start;
    let lastStyle;
    let runner = function ({ style, info }) {
        if (times > 0 && counter >= times) {
            !completed && em.emit('end', runner);
            Object.assign(style, lastStyle);
            completed = true;
        } else {
            start = start || context.globalTimestamp;
            let timestamp = context.globalTimestamp - start;
            counter = parseInt(timestamp/ duration, 10);
            let sources = getTween(keyframes, duration, timestamp) || {};
            style.backgroundImage = sources.backgroundImage || style.backgroundImage;
            style.display = sources.display || style.display;
            style.x += sources.x * info.scale || 0;
            style.y += sources.y * info.scale || 0;
            lastStyle = Object.assign({}, style);
        }
    };

    runner.then = (callback) => {
        em.on('end', callback);
        return runner;
    };

    return runner;
}


export function Tween(keyframes, context) {
    const obj = {};

    obj.run = function ({ duration, times }) {
        return Runner(keyframes, duration, times, context);
    };

    return obj;
}