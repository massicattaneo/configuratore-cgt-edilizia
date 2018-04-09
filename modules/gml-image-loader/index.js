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
                    var img = new Image() ;
                    img.addEventListener('load', function () {
                        resource.data = img;
                        resolve(resource);
                    });
                    img.src = resource.url;
                });
            }))
        }
    }
}
