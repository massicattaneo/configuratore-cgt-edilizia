import { HtmlView } from 'gml-html';
import template from './template.html';
import * as style from './style.scss';
import { RetryRequest } from '../../../../modules/gml-http-request';

export default async function ({ locale, system, thread }) {
    const view = HtmlView('<form enctype="multipart/form-data"/>', []);
    view.style();

    view.get().save = async function () {
        system.store.loading = true;
        await RetryRequest('/api/login/modify', { headers: { 'Content-Type': 'application/json' } })
            .send('PUT', JSON.stringify({
                name: view.get().name.value,
                surname: view.get().surname.value,
                tel: view.get().tel.value,
                organization: view.get().organization.value
            }));
        system.store.loading = false;
    };

    rx.connect
        .partial({
            logged: () => system.store.hasLogged
        })
        .execute(view.clear)
        .filter(s => s && s.logged)
        .subscribe(function () {
            const variables = Object.assign({
                showOrganization: Number(system.store.user.type) === 3 ? 'table-row' : 'none',
                user: system.store.user,
                retailer: system.db.retailers.find(r => r.id === system.store.user.organization) || {}
            }, locale.get());
            view.appendTo('', template, style, variables);
        });

    view.destroy = function () {

    };

    return view;
}