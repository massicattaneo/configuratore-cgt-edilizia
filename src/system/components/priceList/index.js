import { HtmlView } from 'gml-html';
import template from './template.html';
import loadedTpl from './loaded.html';
import * as style from './style.scss';
import { RetryRequest } from '../../../../modules/gml-http-request';
import { getPriceType } from '../../../../web-app-deploy/shared';

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

    view.get().download = async function (includeType) {
        const arr = htmlListToArray(view.get().models).filter(el => el.checked);
        if (arr.length) {
            const type = includeType === 'priceMin' ? getPriceType(system.store.userAuth) : includeType;
            const url = `/api/price-list/?models=${arr.map(m => m.value).join(',')}&includeType=${type}`;
            window.open(url);
        }
    };

    view.get().downloadAttachment = async function (familyId) {
        const model = system.db.models.find(v => v.familyId === familyId);
        const version = system.db.versions.find(v => v.modelId === model.id);
        window.open(`/api/dropbox/${version.priceListAttachment}.pdf`);
    };

    view.destroy = function () {

    };

    rx.connect
        .partial({ logged: () => system.store.hasLogged })
        .execute(view.clear)
        .filter(s => s.logged)
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
                        minimumOn: Number(system.store.userAuth) <= 1
                        || Number(system.store.userAuth) === 3
                        || Number(system.store.userAuth) === 4
                            ? 'inline-block' : 'none',
                        displayCgt: Number(system.store.userAuth) === 2 ? 'inline-block' : 'none',
                        displayOriginalOutsource: Number(system.store.userAuth) === 0 || Number(system.store.userAuth) === 3
                            ? 'inline-block' : 'none',
                        displaySuperAdmin: Number(system.store.userAuth) === 0 ? 'inline-block' : 'none',
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
                                `).join(''),
                            downloadAttachment: `
                                <button type="button"
                                        style="margin-bottom: 10px; width: 100%;"
                                        onclick="this.form.downloadAttachment('${f.id}')"
                                        class="mdl-button mdl-color--accent mdl-color-text--accent-contrast mdl-cell--6-col mdl-cell--order-12-phone">
                                    ALLEGATO FAMIGLIA
                                </button>`
                        }, f))
                    }, locale.get());
                    view.clear().appendTo('', loadedTpl, [], params);
                    componentHandler.upgradeDom();
                });
        });

    return view;
}
