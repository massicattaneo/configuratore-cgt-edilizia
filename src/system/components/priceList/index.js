import { HtmlView } from 'gml-html';
import template from './template.html';
import loadedTpl from './loaded.html';
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

export default async function ({ locale, system, thread }) {
    const view = HtmlView(template, style, {});
    view.style();

    view.get().download = async function () {
        const arr = htmlListToArray(view.get().models).filter(el => el.checked);
        if (arr.length) {
            const url = `/api/price-list/?models=${arr.map(m => m.value).join(',')}`;
            window.open(url);
        }
    };

    view.destroy = function () {

    };

    rx.connect
        .partial({ logged: () => system.store.logged })
        .execute(view.clear)
        .filter(s => s.logged)
        .debounce(300)
        .subscribe(function (logged) {
            view.appendTo('', '<div>CARICANDO LISTINO ...</div>', []);
            system
                .addFileManifest(system.db.models.map(function (m) {
                    return { size: 400000, type: 'image', url: m.src, stage: 'priceList' };
                }))
                .loadStageFiles(['priceList'])
                .start()
                .then(function (images) {
                    const params = Object.assign({
                        familys: system.db.familys.map(f => Object.assign({
                            checkboxes: system.db.models
                                .filter(m => m.familyId === f.id)
                                .map(m => `
                                <label style="height: 80px;" class="mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect" for="${m.id}">
                                    <input value="${m.id}" type="checkbox" id="${m.id}" class="mdl-checkbox__input" name="models">
                                    <span class="mdl-checkbox__label">
                                        <img src="${m.src}?v=${system.info().version}" style="width: 80px"/>
                                        ${m.name}
                                    </span>
                                </label>
                                `).join('')
                        }, f))
                    }, locale.get());
                    view.clear().appendTo('', loadedTpl, [], params);
                    componentHandler.upgradeDom();
                });
        });

    return view;
}