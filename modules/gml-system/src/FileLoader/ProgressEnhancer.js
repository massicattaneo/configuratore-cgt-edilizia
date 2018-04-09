/* eslint require-jsdoc: 'off' */
export default function (bandwidth, onProgress) {
    let totalSize = 0;
    const updaters = [];

    function updatePercentage(percentage, loadedSize, index) {
        if (percentage !== undefined && percentage !== 0 && onProgress) {
            updaters[index] = loadedSize;
            const total = updaters.reduce((a, b) => a + b);
            onProgress((total / totalSize) * 100);
        }
    }

    function Progress(groupSize, resources = []) {
        totalSize += groupSize;
        const obj = {};
        const time = 0.1;
        let loadedSize = 0;
        const index = updaters.length;
        updaters.push(0);
        obj.update = function (percentage) {
            updatePercentage(percentage, percentage * groupSize, index);
        };
        obj.startSimulate = function () {
            resources.forEach(function (res) {
                let fileLoadedSize = 0;
                const interval = setInterval(function () {
                    const chunkSize = time * (bandwidth / resources.length);
                    fileLoadedSize += chunkSize;
                    if (fileLoadedSize < res.size) {
                        loadedSize += chunkSize;
                        updatePercentage((loadedSize / totalSize) * 100, loadedSize, index);
                    }
                }, time * 1000);
                res.finish = function () {
                    const end = res.size - fileLoadedSize;
                    loadedSize += (end > 0) ? end : 0;
                    updatePercentage((loadedSize / totalSize) * 100, loadedSize, index);
                    clearInterval(interval);
                };
            });
        };
        obj.simulateCompletedOne = function (size) {
            const filter = resources.filter(res => res.size === size)[0];
            filter.finish();
            resources.splice(resources.indexOf(filter), 1);
        };
        obj.end = function () {

        };
        return obj;
    }
    Progress.getTotalSize = () => totalSize;
    return Progress;
}
