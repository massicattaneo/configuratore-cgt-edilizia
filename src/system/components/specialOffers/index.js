import {HtmlView} from "gml-html";
import template from './template.html';
import * as style from './style.scss';

export default async function ({locale, system, thread}) {
    const params = Object.assign({
        specialOffers: system.db.specialOffers || []
    }, locale.get());
    const view = HtmlView(template, style, params);
    view.style();

    view.destroy = function () {

    };

    return view;
}