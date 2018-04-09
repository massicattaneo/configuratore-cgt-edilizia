/* eslint require-jsdoc: 'off' */
import EventEmitter from '../../../gml-event-emitter';
import ProgressEnhancer from './ProgressEnhancer';
import Promise from '../../../gml-event-emitter/Promise';

export default function (groupedRes, loaders, quality, bandwidth, { system, MaxRetry, RetryTimeout } = {}) {
    const stageLoader = {};
    const em = EventEmitter();
    const middlewares = [];
    const Progress = ProgressEnhancer(bandwidth, function (percentage) {
        em.emit('progress', percentage);
    });

    function applyMiddlewares(srcs) {
        middlewares.forEach((mw) => {
            srcs.forEach((res, index, array) => mw(res, index, function (host) {
                const hoster = loaders[res.type].hostedOn || (res => res);
                hoster(host, res);
            }));
        });
        return srcs;
    }

    stageLoader.start = function () {
        const start = Date.now();
        return new Promise(function (rs, rj) {
            Promise.all(Object.keys(groupedRes)
                .map(ext => loaders[ext]
                    .load({ resources: applyMiddlewares(groupedRes[ext]), quality, Progress, MaxRetry, RetryTimeout })))
                .then((srcs = []) => {
                    const end = Date.now();
                    const totalSize = Progress.getTotalSize();
                    const duration = end - start;
                    const resourcesStats = srcs
                        .reduce((a, b) => a.concat(b ? b.resources : undefined), [])
                        .reduce((a, b) => a.concat(b ? b.stats : undefined), [])
                        .filter(i => i !== undefined);
                    em.emit('complete', { totalSize, start, end, duration, resourcesStats });
                    em.clear();
                    rs(srcs);
                }).catch(function (error) {
                    em.emit('error', error);
                    system.throw('system', error);
                    rj(error);
                });
        });
    };
    stageLoader.beforeLoad = function (callback) {
        middlewares.push(callback);
        return stageLoader;
    };
    stageLoader.on = function (event, callback) {
        em.on(event, callback);
        return stageLoader;
    };
    stageLoader.totalSize = function () {
        return Object.keys(groupedRes)
            .map(ext => loaders[ext].totalSize({ resources: groupedRes[ext], quality }))
            .reduce((a, b) => a + b);
    };
    return stageLoader;
}
