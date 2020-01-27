import { HtmlView } from 'gml-html';
import template from './template.html';
import adminTemplate from './admin.html';
import othersTemplate from './others.html';
import workshop from './workshop.html';
import * as style from './style.scss';
import { isWorkshop } from '../../../../web-app-deploy/shared';

export default async function ({ locale, system }) {
    const view = HtmlView(template, style, locale.get());

    rx.connect({ userAuth: system.store.userAuth }, ({ userAuth }) => {
        view.clear('wrapper');
        if (isWorkshop(userAuth)) {
            view.appendTo('wrapper', workshop, style, locale.get());
        } else if (system.store.userAuth !== undefined && system.store.userAuth.toString() === '0') {
            view.appendTo('wrapper', adminTemplate, style, locale.get());
        } else {
            view.appendTo('wrapper', othersTemplate, style, locale.get());
        }
    });

    return view;
}
