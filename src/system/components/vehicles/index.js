import {HtmlView} from "gml-html";
import template from './template.html';
import * as style from './style.scss';

export default async function () {
    const view = HtmlView(template, style);

    view.destroy = function () {

    };

    return view;
}