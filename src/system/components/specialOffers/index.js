import {HtmlView} from "gml-html";
import template from './template.html';
import * as style from './style.scss';

export default async function ({locale, system, thread}) {
    const view = HtmlView('<div/>', style, {});
    view.style();

    rx.connect({ logged: () => system.store.logged }, function (logged) {
        view.clear();
        if (logged) {
            setTimeout(function() {
                const params = Object.assign({
                    specialOffers: system.db.specialOffers || []
                }, locale.get());
                view.appendTo('', template, [], params)
            }, 300)
        }
    });

    view.destroy = function () {

    };

    return view;
}