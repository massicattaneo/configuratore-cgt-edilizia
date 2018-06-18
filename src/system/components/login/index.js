import {HtmlView} from "gml-html";
import template from './template.html';
import * as style from './style.scss';

export default async function ({ system, locale, thread }) {
    const view = HtmlView(template, style, locale.get());
    view.style();

    let form = view.get('wrapper');
    form.login = async function login() {
        system.store.loading = true;
        const data = {
            password: form.password.value,
            email: form.email.value,
            lang: system.info().lang,
        };
        await thread.execute('user/login', data);
        system.store.loading = false;
        system.navigateTo(locale.get('urls.homePage.href'));
        system.store.logged = true;
    };

    view.destroy = function () {

    };

    return view;
}