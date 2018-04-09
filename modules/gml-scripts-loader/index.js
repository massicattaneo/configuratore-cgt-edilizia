/* eslint require-jsdoc: "off" */
import Promise from '../gml-event-emitter/Promise';
import GenericLoader from '../gml-generic-loader';

function load(script, obj) {
    return new Promise(function (res, rej) {
        const scriptEl = document.createElement('script');
        scriptEl.async = true;
        document.head.appendChild(scriptEl);
        const start = Date.now();
        scriptEl.addEventListener('load', function (e) {
            res({stats: obj.stats(start, Date.now(), script.url, script.size), resource: e});
        });
        scriptEl.addEventListener('error', function (e) {
            rej(obj.error(e, script.url));
        });
        scriptEl.src = script.url;
    });
}

/**
 * @class ScriptsLoader
 * @example
 * const sl = ScriptsLoader();
 * @returns {object} a new Scripts Loader
 *  */
export default function ({ maxRetry = 5, retryTimeout = 1000 } = {}) {
    const obj = GenericLoader('SCRIPT');

    function retry(resource) {
        return new Promise(function (resolve, reject) {
            (function req(counter) {
                load(resource, obj)
                    .then(resolve)
                    .catch((e) => {
                        if (counter <= maxRetry) {
                            setTimeout(function () {
                                req(counter + 1);
                            }, retryTimeout);
                        } else {
                            reject(e);
                        }
                    });
            }(1));
        });
    }

    /**
     * method that implements the loading process of the fonts
     * @method FontsLoader#load
     * @param {object} the parameters coming from the loader
     * @param {array} options.resources an array of resources: ex: [
     *      {url: "assets/fonts/Gobold.ttf", size: 19384, name: "Gobold" }
     * ]
     * @param {function} options.Progress a class for managing the progress
     * @returns {object} Promise resolved when all the fonts are loaded
     * */
    obj.load = function ({ resources, Progress }) {
        const totSize = resources.map(it => it.size).reduce((itA, itB) => itA + itB);
        /* eslint arrow-body-style: "off" */
        const progress = Progress(totSize, resources.map((it) => {
            return { size: it.size };
        }));
        progress.startSimulate();
        return new Promise((resolve, reject) => {
            Promise.all(resources.map((resource) => {
                return retry(resource).then(function (res) {
                    progress.simulateCompletedOne(resource.size);
                    return res;
                }).catch(function (e) {
                    reject(e);
                });
            })).then((srcs) => {
                resolve(obj.success(srcs));
            });
        });
    };
    obj.totalSize = function ({ resources }) {
        return resources.map(it => it.size).reduce((itA, itB) => itA + itB);
    };
    /**
     * method that change the url of the resource adding the host
     * @method FontsLoader#hostedOn
     * @param {string} host - the host to add
     * @param {object} res - the resource to modify
     * */
    obj.hostedOn = function (host = '', res) {
        res.url = host + res.url;
    };
    return obj;
}
