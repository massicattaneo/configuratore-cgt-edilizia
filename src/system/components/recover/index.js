import {HtmlView} from "gml-html";
import template from './template.html';
import * as style from './style.scss';
import recoverDone from './recover-done.html';

export default async function ({locale, system, thread}) {
    const view = HtmlView(template, style, locale.get());
    view.style();

    const form = view.get('wrapper');
    form.recover = async function () {
        await thread.execute('user/recover', { email: form.email.value });
        view.clear().appendTo('', recoverDone, [], locale.get());
    };

    view.destroy = function () {

    };

    return view;
}