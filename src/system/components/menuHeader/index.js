import {HtmlView} from "gml-html";
import template from './template.html';
import * as style from './style.scss';

export default async function ({ locale, system, thread }) {
    const view = HtmlView(template, style, locale.get());
    view.style();

    rx.connect
        .partial({
            logged: () => system.store.hasLogged,
            email: () => system.store.email
        })
        .subscribe(function ({logged, email}) {
            view.get('email').innerHTML = logged ? email : locale.get('menuHeader.userNotLogged');
            view.get('logout').style.display = logged ? 'block' : 'none';
            view.get('login').style.display = !logged ? 'block' : 'none';
            view.get('register').style.display = !logged ? 'block' : 'none';
        });

    view.get('form').logout = async function () {
        system.store.loading = true;
        await thread.execute('user/logout');
        system.store.loading = false;
        system.store.logged = false;
        system.navigateTo(locale.get('urls.homePage.href'));
    };

    return view;
}
