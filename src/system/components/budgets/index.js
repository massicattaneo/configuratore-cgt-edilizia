import { HtmlView } from 'gml-html';
import template from './template.html';
import vehiclebudgetsTpl from './vehiclebudgets.html';
import equipmentbudgetsTpl from './equipmentbudgets.html';
import * as style from './style.scss';
import { RetryRequest } from '../../../../modules/gml-http-request';

export default async function ({ system, gos, locale }) {
    const view = HtmlView(template, style);

    rx.connect({
        vehiclebudgets: () => system.store.vehiclebudgets,
        equipmentbudgets: () => system.store.equipmentbudgets,
    }, function ({ vehiclebudgets, equipmentbudgets }) {
        const vb = vehiclebudgets
            .sort((b, a) => new Date(a.created).getTime() - new Date(b.created).getTime())
            .filter(i => !i.ordered)
            .map(b => {
                return Object.assign({
                    validity: b.summary.validity,
                    photo: system.db.models.find(m => m.id === b.model).src,
                    clientName: b.client.name ? `CLIENTE: ${b.client.name}` : 'NESSUN CLIENTE INSERITO',
                    disabled: b.client.name ? '' : 'disabled="disabled"'
                }, b);
            });
        const eb = equipmentbudgets
            .sort((b, a) => new Date(a.created).getTime() - new Date(b.created).getTime())
            .filter(i => !i.ordered)
            .map(b => {
                const txtEq = b.equipment.map(id => system.db.equipements.find(i => i.id === id).name).join('</li><li>');
                return Object.assign({
                    equipments: `<ul><li>${txtEq}</li></ul>`,
                    validity: b.summary.validity,
                    clientName: b.client.name ? `CLIENTE: ${b.client.name}` : 'NESSUN CLIENTE INSERITO',
                    disabled: b.client.name ? '' : 'disabled="disabled"'
                }, b);
            });
        view.clear('vehiclebudgets').appendTo('vehiclebudgets', vehiclebudgetsTpl, [], { vehiclebudgets: vb });
        view.clear('equipmentbudgets').appendTo('equipmentbudgets', equipmentbudgetsTpl, [], { equipmentbudgets: eb });
    });

    const form = view.get();

    form.delete = async function (table, id) {
        if (confirm('SEI SICURO DI VOLER ELIMINARE QUESTO PREVENTIVO?')) {
            const item = system.store[table].find(i => i._id === id);
            await RetryRequest(`/api/rest/${table}/${id}`, {}).send('DELETE');
            if (table === 'vehiclebudgets') {
                gos.vehicles.createNew();
                for (let i = 0; i < item.files.length; i++) {
                    await RetryRequest(`/api/upload/${item.files[i]._id}`, {}).send('DELETE');
                }
            } else {
                gos.equipments.createNew();
            }
            system.store[table].splice(system.store[table].indexOf(item), 1);
        }
    };

    form.modify = function (table, id) {
        const item = Object.assign({}, system.store[table].find(i => i._id === id));
        if (table === 'vehiclebudgets') {
            item.id = item._id;
            delete item._id;
            delete item.photo;
            delete item.validity;
            gos.vehicles.updateFromItem(item);
            system.navigateTo('/it/configuratore-macchine');
        } else {
            item.id = item._id;
            delete item._id;
            gos.equipments.updateFromItem(item);
            system.navigateTo('/it/configuratore-attrezzature');
        }
    };

    form.order = function (table, id) {
        const budget = system.store[table].find(i => i._id === id);
        if (budget.client.email === '') system.throw('missingBudgetClientEmail');
        gos.createOrder.init(table, id);
        system.navigateTo(`${locale.get('urls.createOrder.href')}?table=${table}&id=${id}`)
    };

    form.email = async function (table, id) {
        const budget = system.store[table].find(i => i._id === id);
        if (budget.client.email === '') system.throw('missingBudgetClientEmail');
        if (confirm(`INVIARE UNA COPIA DELL'OFFERTA A TE ED ALL'EMAIL DEL CLIENTE "${budget.client.email}" ?`)) {
            await RetryRequest(`/api/email/${table}/${id}`, {}).get();
        }
    };

    form.preview = async function(table, id) {
        window.open(`/api/pdf/${table}/${id}`)
    };

    view.destroy = function () {

    };

    return view;
}