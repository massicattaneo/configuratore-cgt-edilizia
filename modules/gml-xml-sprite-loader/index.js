export default function () {
    return {
        load: ({ resources, Progress }) => {
            const totSize = resources.map(it => it.size).reduce((itA, itB) => itA + itB);
            const progress = Progress(totSize, resources.map((it) => {
                return { size: it.size };
            }));
            progress.startSimulate();
            return Promise.all(resources.map((resource) => {
                return new Promise(function (resolve) {
                    Promise.all([
                        new Promise(function (resolve) {
                            var img = new Image();
                            img.addEventListener('load', function () {
                                resource.sprite = img;
                                resolve();
                            });
                            img.src = resource.url + '.png';
                        }),
                        new Promise(function (resolve) {
                            return fetch(resource.url + '.xml')
                                .then(response => response.text())
                                .then(res => {
                                    var lines = res.split('\n');
                                    lines.splice(0, 1);
                                    lines.splice(lines.length - 1, 1);
                                    resource.json = {
                                        filename: '',
                                        frames: lines.map(function (line) {
                                            return {
                                                filename: line.match(/ref="([^"]*)"/)[1] + '.png',
                                                frame: {
                                                    x: line.match(/x="([^"]*)"/)[1],
                                                    y: line.match(/y="([^"]*)"/)[1],
                                                    w: line.match(/width="([^"]*)"/)[1],
                                                    h: line.match(/height="([^"]*)"/)[1]
                                                }
                                            };
                                        })
                                    };
                                    resolve();
                                })
                        })
                    ]).then(function () {
                        resolve(resource);
                    })
                });
            }))
        }
    }
}
