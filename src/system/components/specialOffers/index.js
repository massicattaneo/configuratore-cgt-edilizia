import { HtmlView } from 'gml-html';
import template from './template.html';
import * as style from './style.scss';

export default async function ({ locale, system, thread }) {
    const view = HtmlView('<div/>', style, {});
    view.style();

    rx.connect
        .partial({ logged: () => system.store.hasLogged })
        .subscribe(function ({ logged }) {
            view.clear();
            if (logged) {
                const params = Object.assign({
                    specialOffers: system.db.specialOffers
                        .filter(o => o.userAuth.indexOf(system.store.userAuth) !== -1)
                }, locale.get());
                view.appendTo('', template, [], params);
            }
        });

    view.destroy = function () {

    };

    return view;
}