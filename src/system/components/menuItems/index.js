import {HtmlView} from "gml-html";
import template from './template.html';
import adminTemplate from './admin.html';
import workshop from './workshop.html';
import * as style from './style.scss';

export default async function ({ locale, system }) {
    let view;

    if (system.store.userAuth !== undefined && system.store.userAuth.toString() === '5') {
        view = HtmlView(workshop, style, locale.get());
    } else if (system.store.userAuth !== undefined && system.store.userAuth.toString() === '0') {
        view = HtmlView(adminTemplate, style, locale.get());
    } else {
        view = HtmlView(template, style, locale.get());
    }

    return view;
}
