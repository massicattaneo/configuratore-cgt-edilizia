import { HtmlView } from 'gml-html';
import template from './template.html';
import * as style from './style.scss';
import { RetryRequest } from '../../../../modules/gml-http-request';
import { isOutsource, isWorkshop, isOutsourceDirection } from '../../../../web-app-deploy/shared';

export default async function ({ locale, system, thread }) {
    const view = HtmlView('<form enctype="multipart/form-data"/>', []);
    view.style();

    view.get().save = async function () {
        system.store.loading = true;
        const discount = Number(view.get().discount.value.replace(',', '.'));
        if (isNaN(discount)) system.throw('custom', { message: 'La percentuale e\' in un formato incorretto' });
        await RetryRequest('/api/login/modify', { headers: { 'Content-Type': 'application/json' } })
            .send('PUT', JSON.stringify({
                name: view.get().name.value,
                surname: view.get().surname.value,
                tel: view.get().tel.value,
                organization: system.store.user.organization,
                discount
            }));
        system.store.loading = false;
        console.log(system.store.userAuth)
        if (Number(system.store.userAuth) === 3) {
            setTimeout(() => location.reload(), 1000);
            system.throw('custom', { message: 'Informazioni salvate - Il configuratore verrá ricaricato in automatico' });
        } else {
            system.throw('custom', { message: 'Informazioni salvate' });
        }
    };

    rx.connect
        .partial({
            logged: () => system.store.hasLogged
        })
        .execute(view.clear)
        .filter(s => s && s.logged)
        .subscribe(function () {
            const variables = Object.assign({
                showWorkshop: isWorkshop(system.store.user.type) ? 'table-row' : 'none',
                showOrganization: isOutsource(system.store.user.type) ? 'table-row' : 'none',
                user: system.store.user,
                showDiscount: isOutsourceDirection(system.store.user.type) ? 'block' : 'none',
                retailer: system.db.retailers.find(r => r.id === system.store.user.organization) || {}
            }, locale.get());
            view.appendTo('', template, style, variables);
        });

    view.destroy = function () {

    };

    return view;
}
