export function WindowNamespace(name, value) {
    return name.split('.').reduce((ret, namespace, index, array) => {
        ret[namespace] = ret[namespace] || ((index === array.length - 1) ? (value || {}) : {});
        return ret[namespace];
    }, window);
}
