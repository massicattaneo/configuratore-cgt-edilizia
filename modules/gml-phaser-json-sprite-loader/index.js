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
                            var img = new Image() ;
                            img.addEventListener('load', function () {
                                resource.sprite = img;
                                resolve();
                            });
                            img.src = resource.url + '.png';
                        }),
                        new Promise(function (resolve) {
                            return fetch(resource.url + '.json')
                                .then(response => response.json())
                                .then(res => {
                                    resource.json = res;
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
