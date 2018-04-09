import Promise from '../../../gml-event-emitter/Promise';

const wait = {};
let breakAt = '';
let qaaResolver = e => e;

wait.promise = (resolver) => new Promise(resolver);

wait.time = (time) => {
    return new Promise((resolve) => {
        setTimeout(resolve, time);
    });
};

wait.event = (component, eventName) => {
    return new Promise((resolve) => {
        const remove = component.on(eventName, (a) => {
            remove();
            resolve(a);
        });
    });
};

wait.all = (array) => {
    return Promise.all(array);
};

wait.some = (array) => {
    return new Promise((resolve) => {
        array.forEach(p => p.then(resolve));
    });
};

wait.qaa = (breakPoint) => {
    if (breakAt === breakPoint) return new Promise(res => qaaResolver = res);
    return new Promise(res => res());
};

window.stopAt = (name)=> {
    qaaResolver();
    breakAt = name;
};

export default wait;
