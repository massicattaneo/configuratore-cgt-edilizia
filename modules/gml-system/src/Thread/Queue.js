import Promise from '../../../gml-event-emitter/Promise';

export default function (array = []) {
    const queue = array.slice(0);
    let paused = false;
    let promise;

    function run() {
        if (!queue[0]) {
            queue.length = 0;
            return run.resolve();
        }
        if (!paused) {
            const promise = queue.splice(0, 1)[0]();
            if (promise && promise.then) {
                promise.then(run).catch(run.reject);
            } else {
                run();
            }
        }
    }

    queue.play = () => {
        if (promise) {
            if (paused) run();
        } else {
            promise = new Promise(function (res, rej) {
                run.resolve = res;
                run.reject = rej;
                run();
            });
        }
        return promise;
    };

    queue.pause = () => {
        paused = true;
    };

    queue.stop = () => {
        paused = true;
        run.reject();
        queue.length = 0;
    };

    return queue;
}
