/* eslint require-jsdoc: 'off' */
import Promise from 'gml-event-emitter/Promise';
import {HttpRequest} from 'gml-http-request';

const memo = {};
export default function Localization(config) {
    const loc = {} ;
    const i18n = {system: config};

    function merge(lc, namespace) {
        if (namespace) {
            const toMerge = {};
            toMerge[namespace] = lc;
            Object.assign(i18n, toMerge);
        } else {
            Object.assign(i18n, lc);
        }
    }

    loc.load = (file, namespace) => {
        if (memo[file]) {
            merge(memo[file], namespace);
            return Promise.resolve(loc);
        }
        const request = HttpRequest(file + `?v=${config.version}`, {
            headers: {
                'Content-type': 'application/json'
            }
        });
        return request.get().then(res => {
            const json = JSON.parse(res.responseText);
            memo[file] = json;
            merge(json, namespace);
            return loc;
        });
    };

    loc.get = (id, ...args) => {
        if (!id) return i18n;
        const string = id.split('.').reduce((ret, b) => {
            return ret[b] || {};
        }, i18n);
        return [string, ...args].reduce((a, b, i) => {
            const regEx = new RegExp(`\\{${i - 1}\\}`, 'g');
            return a.replace(regEx, b);
        });
    };

    loc.parse = (string, ...args) => {
        return [string, ...args].reduce((a, b, i) => {
            const regEx = new RegExp(`\\{${i - 1}\\}`, 'g');
            const source = loc.get(b);
            return a.replace(regEx, source instanceof String ? source : b);
        });
    };

    return loc;
}
