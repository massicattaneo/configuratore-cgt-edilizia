import {HtmlView} from "gml-html";
import template from './template.html';
import * as style from './style.scss';

export default async function ({locale, system, thread}) {
    const view = HtmlView(template, style, locale.get());
    view.style();

    view.destroy = function () {

    };

    return view;
}