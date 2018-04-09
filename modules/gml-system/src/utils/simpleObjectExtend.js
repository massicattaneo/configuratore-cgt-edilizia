export default function(target, extend) {
    for (const key in extend) {
        if (extend.hasOwnProperty(key)) {
            target[key] = extend[key];
        }
    }
};
