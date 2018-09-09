import * as style from './style.scss';
import template from './template.html';
import { HtmlView } from 'gml-html';

export default function (params) {
    const icon = HtmlView(template, style, params);
    icon.style('');
    return icon;
}