/**
 * @class GenericLoader
 * @example
 * const sl = GenericLoader();
 * @returns {object} a new Generic Loader
 *  */

function getOrigin(string) {
    const a = document.createElement('a');
    a.href = string;
    return a.origin;
}

function getUrl(string) {
    const a = document.createElement('a');
    a.href = string;
    return a.pathname.substr(Number(a.pathname[0] === '/'));
}


export default function (loaderType) {
    const obj = {};

    obj.stats = function (start, end, fileName, totalSize) {

        if (window.performance && window.performance.getEntriesByType) {
            const src = window.performance.getEntriesByType('resource')
                .filter(res => res.name.indexOf(fileName) !== -1)[0];
            if (src) {
                const duration = src.duration;
                const totalTime = duration / 1000;
                const bandwidth = totalSize / totalTime;
                const size = src.encodedBodySize;
                return {
                    totalTime, bandwidth, loaderType, origin: getOrigin(fileName), url: getUrl(fileName),
                    size, start, end, duration, evaluationMethod: 'PerformanceAPI'
                };
            }
        }
        const duration = end - start;
        const totalTime = duration / 1000;
        const bandwidth = totalSize / totalTime;
        return { totalTime, bandwidth, size: totalSize, start, origin: getOrigin(fileName), url: getUrl(fileName),
            end, duration, evaluationMethod: 'timeBased' };
    };

    obj.success = function (resources) {
        return { type: loaderType, resources };
    };

    obj.error = function (description, fileUrl) {
        const type = 'GENERAL_ERROR';
        const subType = 'CONNECTION';
        return { description, type, subType, loaderType, origin: getOrigin(fileUrl), url: getUrl(fileUrl) };
    };

    return obj;
}
