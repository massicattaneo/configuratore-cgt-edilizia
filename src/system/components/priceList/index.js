import {HtmlView} from "gml-html";
import template from './template.html';
import * as style from './style.scss';
import { RetryRequest } from '../../../../modules/gml-http-request';

function htmlListToArray(elements) {
    const arr = [];
    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        arr.push(el);
    }
    return arr;
}

export default async function ({locale, system, thread}) {
    const params = Object.assign({
        familys: system.db.familys.map(f => Object.assign({
            checkboxes: system.db.models
                .filter(m => m.familyId === f.id)
                .map(m => `
                    <label style="height: 80px;" class="mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect" for="${m.id}">
                        <input value="${m.id}" type="checkbox" id="${m.id}" class="mdl-checkbox__input" name="models">
                        <span class="mdl-checkbox__label">
                            <img src="${m.src}" style="width: 80px"/>
                            ${m.name}
                        </span>
                    </label>
                `).join('')
        },f))
    }, locale.get());
    const view = HtmlView(template, style, params);
    view.style();

    view.get().download = async function() {
        const arr = htmlListToArray(view.get().models).filter(el => el.checked);
        if (arr.length) {
            const url = `/api/price-list/?models=${arr.map(m => m.value).join(',')}`;
            window.open(url);
        }

    };

    view.destroy = function () {

    };

    return view;
}