import cookie from '../utils/cookieManager';

const supportsLocalStorage = (function () {
    const mod = '****TESTING_LOCAL_STORAGE****';
    try {
        localStorage.setItem(mod, mod);
        const value = localStorage.getItem(mod);
        localStorage.removeItem(mod);
        return !!value;
    } catch (e) {
        return false;
    }
}());

export default (p) => {
    const obj = {};
    const storage = supportsLocalStorage ? localStorage : cookie;
    const path = p.cookiePath || '/';
    const prefix = (p.prefix) ? `${p.prefix}.` : '';
    const prefixProperty = propertyName => prefix + propertyName;
    const _get = propertyKey => JSON.parse(storage.getItem(prefixProperty(propertyKey)));
    const accessCounter = (Number(_get('accessCounter')) || 0) + 1;

    obj.set = (params) => {
        params &&
        Object.keys(params).forEach((name) => {
            storage.setItem(prefixProperty(name), JSON.stringify(params[name]), 365, path);
        });
    };
    obj.get = propertyKey => _get(propertyKey);
    obj.remove = (propertyKey) => {
        storage.removeItem(prefixProperty(propertyKey), path);
    };
    obj.accessCounter = () => accessCounter;

    obj.set({ accessCounter });

    return obj;
};
