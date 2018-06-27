import { HtmlView } from 'gml-html';
import template from './template.html';
import * as style from './style.scss';
import { RetryRequest } from '../../../../modules/gml-http-request';

export default async function ({ locale, system, thread }) {
    const view = HtmlView('<form enctype="multipart/form-data"/>', []);
    view.style();

    // const store = rx.create({
    //     logo: '',
    //     text: ''
    // });
    //
    // view.get().upload = async function () {
    //     system.store.loading = true;
    //     const file = await RetryRequest('/api/upload', { timeout: 30000 }).post(new FormData(this))
    //         .catch(function (e) {
    //             system.throw('generic-error');
    //             system.store.loading = false;
    //         });
    //     setTimeout(function () {
    //         store.logo = `/api/dropbox/Uploads/${JSON.parse(file.responseText).url}`;
    //         system.store.loading = false;
    //     }, 100);
    // };
    //
    // rx.connect
    //     .partial({
    //         logo: () => store.logo,
    //         text: () => store.text,
    //         logged: () => system.store.logged
    //     })
    //     .execute(view.clear)
    //     .filter(s => s && s.logged)
    //     .subscribe(function ({ logo, text }) {
    //         view.appendTo('', template, style, { text, logo, user: system.store.user });
    //     });
    //
    // view.destroy = function () {
    //
    // };

    return view;
}