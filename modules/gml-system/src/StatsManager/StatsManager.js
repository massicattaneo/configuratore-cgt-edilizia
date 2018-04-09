/* eslint require-jsdoc: "off" */
import Promise from '../../../gml-event-emitter/Promise';

export default function (system, { enabled = false } = {}) {
    const obj = {};
    const ts = [null, null, null, null, null, null];
    obj.status = function ({ statusIndex, DOM_LOADING, params }) {
        ts[statusIndex] = Math.abs(DOM_LOADING - Date.now()) / 1000;
    };

    obj.trace = function (trackUrl, params) {

    };

    return obj;
}
