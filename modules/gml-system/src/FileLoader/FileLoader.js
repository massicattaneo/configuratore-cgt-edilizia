/* eslint require-jsdoc: 'off' */
import StageLoader from './StageLoader';
import simpleObjectExtend from '../utils/simpleObjectExtend';

function estimatedLoadingTime(array) {
    return array.map(item => item.totalSize / item.bandwidth.value).reduce((a, b) => a + b);
}

function elapsedLoadingTime(array) {
    const toSubtract = array.map(function (actual, index) {
        const previous = array[index - 1];
        if (previous) {
            if (previous.end > actual.start) {
                return Math.min(previous.end, actual.end) - actual.start;
            }
        }
        return 0;
    }).reduce((a, b) => a + b);
    return (array.map(item => item.duration).reduce((a, b) => a + b) - toSubtract) / 1000;
}
function totalSize(array) {
    return array.map(item => item.totalSize).reduce((a, b) => a + b);
}

function groupByType(array) {
    const ret = {};
    array.forEach((item) => {
        ret[item.type] = ret[item.type] || [];
        ret[item.type].push(item);
    });
    return ret;
}

export default function (system) {
    const obj = {};
    const loaders = {};
    let files = [];
    const stats = [];
    obj.addLoader = function (fileTypes, loader) {
        fileTypes.forEach((type) => {
            loaders[type] = loader;
        });
    };

    obj.addManifest = function (manifest, params = {}) {
        simpleObjectExtend(manifest, params);
        if (manifest instanceof Array) {
            manifest.forEach(function (item) {
                simpleObjectExtend(item, params);
            });
        }
        files = files.concat(manifest);
    };

    obj.loadStage = function (stages, quality, bandwidth, { MaxRetry, RetryTimeout, forcedAssetsQuality } = {}) {
        const original = [].concat(stages)
            .map(stage => files.filter(file => [].concat(file.stage).indexOf(stage) !== -1))
            .reduce((itA, itB) => itA.concat(itB))
            .filter(item => item.state !== 'loaded' || forcedAssetsQuality);
        original.forEach(item => item.state = 'loading');
        const stageFiles = JSON.parse(JSON.stringify(original));
        const groupedRes = groupByType(stageFiles);
        const stageLoader = StageLoader(groupedRes, loaders, quality,
            bandwidth.value, { system, MaxRetry, RetryTimeout });
        stageLoader.on('complete', (stat) => {
            const item = { stages: [].concat(stages), bandwidth };
            original.forEach(item => {
                const state = 'loaded';
                const {size} = stat.resourcesStats.filter(i => item.url.indexOf(i.url) !== -1)[0] || {};
                simpleObjectExtend(item, { size, state });
            });
            simpleObjectExtend(item, stat);
            stats.push(item);
        });
        stageLoader.on('error', () => {
            original.forEach(item => item.state = undefined);
        });
        return stageLoader;
    };

    obj.totalSize = function (stages, quality, bandwidth) {
        const stageFiles = []
            .concat(stages)
            .map(stage => files.filter(file => file.stage === stage))
            .reduce((itA, itB) => itA.concat(itB));
        const groupedRes = groupByType(stageFiles);
        const stageLoader = StageLoader(groupedRes, loaders, quality, bandwidth.value);
        return stageLoader.totalSize();
    };

    obj.stats = function () {
        return {
            stages: stats.map((item) => {
                return {
                    stages: item.stages.join(', '),
                    estimatedLoadingTime: estimatedLoadingTime([item]),
                    elapsedLoadingTime: elapsedLoadingTime([item]),
                    totalSize: item.totalSize,
                    sampleSize: item.bandwidth.sampleSize
                };
            }),
            estimatedLoadingTime: estimatedLoadingTime(stats),
            elapsedLoadingTime: elapsedLoadingTime(stats),
            totalSize: totalSize(stats),
            sampleSize: stats[0] ? stats[0].bandwidth.sampleSize : 0
        };
    };

    return obj;
}
