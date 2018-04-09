import {HtmlView} from "gml-html";
import template from './template.html';
import * as style from './style.scss';
import resetDone from './reset-done.html';

export default async function ({locale, system, thread}) {
    const view = HtmlView(template, style, locale.get());
    view.style();

    let form = view.get('wrapper');
    form.reset = async function () {
        thread.execute('user/reset', {
            activationCode: system.info().activationCode,
            password: form.password.value
        });
        view.clear().appendTo('', resetDone, [], locale.get());
    };

    view.destroy = function () {

    };

    return view;
}