import { HtmlView } from 'gml-html';
import template from './template.html';
import vehicleordersTpl from './vehicleorders.html';
import equipmentordersTpl from './equipmentorders.html';
import * as style from './style.scss';
import { RetryRequest } from '../../../../modules/gml-http-request';
import { createOrderXlsName } from '../../../../web-app-deploy/shared';

export default async function ({ system, gos, locale }) {
    const view = HtmlView(template, style);

    rx.connect
        .partial({
            vehicleorders: () => system.store.vehicleorders,
            equipmentorders: () => system.store.equipmentorders
        })
        .filter(() => system.store.logged)
        .subscribe(function ({ vehicleorders, equipmentorders }) {
            const vb = vehicleorders
                .sort((b, a) => new Date(a.created).getTime() - new Date(b.created).getTime())
                .map(o => {
                    const b = system.store.vehiclebudgets.find(r => r._id === o.budgetId);
                    return Object.assign({
                        validity: b.summary.validity,
                        photo: `${system.db.models.find(m => m.id === b.model).src}?v=${system.info().version}`,
                        clientName: b.client.name ? `CLIENTE: ${b.client.name}` : 'NESSUN CLIENTE INSERITO',
                        disabled: b.client.name ? '' : 'disabled="disabled"'
                    }, o);
                });
            const eb = equipmentorders
                .sort((b, a) => new Date(a.created).getTime() - new Date(b.created).getTime())
                .map(o => {
                    const b = system.store.equipmentbudgets.find(r => r._id === o.budgetId);
                    const txtEq = b.equipment.map(id => system.db.equipements.find(i => i.id === id).name).join('</li><li>');
                    return Object.assign({
                        equipments: `<ul><li>${txtEq}</li></ul>`,
                        clientName: b.client.name ? `CLIENTE: ${b.client.name}` : 'NESSUN CLIENTE INSERITO',
                        disabled: b.client.name ? '' : 'disabled="disabled"'
                    }, o);
                });
            view.clear('vehicleorders').appendTo('vehicleorders', vehicleordersTpl, [], { vehicleorders: vb });
            view.clear('equipmentorders').appendTo('equipmentorders', equipmentordersTpl, [], { equipmentorders: eb });
        });

    view.get().delete = async function (table, id) {
        if (confirm('SEI SICURO DI VOLER ELIMINARE QUESTO ORDINE?')) {
            system.store.loading = true;
            const item = system.store[table].find(i => i._id === id);
            await RetryRequest(`/api/rest/${table}/${id}`, { headers: { 'Content-Type': 'application/json' } })
                .send('PUT', JSON.stringify({ deleted: true }));
            const budget = system.store[table.replace('orders', 'budgets')].find(b => b._id === item.budgetId);
            if (table === 'vehicleorders') {
                budget.id = budget._id;
                delete budget._id;
                delete budget.photo;
                delete budget.validity;
                gos.vehicles.updateFromItem(budget);
                system.navigateTo('/it/configuratore-macchine');
            } else {
                budget.id = budget._id;
                delete budget._id;
                gos.equipments.updateFromItem(budget);
                system.navigateTo('/it/configuratore-attrezzature');
            }
            system.store[table].splice(system.store[table].indexOf(item), 1);
            await RetryRequest(`/api/mail/order-delete`, { headers: { 'Content-Type': 'application/json' } })
                .post(JSON.stringify({ order: createOrderXlsName(item, system.store.user) }));
            system.store.loading = false;
            for (let i = 0; i < item.files.length; i++) {
                await RetryRequest(`/api/upload/${item.files[i]._id}`, {}).send('DELETE');
            }
        }
    };


    view.destroy = function () {

    };

    return view;
}
