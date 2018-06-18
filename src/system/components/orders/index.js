import { HtmlView } from 'gml-html';
import template from './template.html';
import vehicleordersTpl from './vehicleorders.html';
import equipmentordersTpl from './equipmentorders.html';
import * as style from './style.scss';
import { RetryRequest } from '../../../../modules/gml-http-request';

export default async function ({ system, gos, locale }) {
    const view = HtmlView(template, style);

    rx.connect({
        vehicleorders: () => system.store.vehicleorders,
        equipmentorders: () => system.store.equipmentorders,
    }, function ({ vehicleorders, equipmentorders }) {
        const vb = vehicleorders
            .sort((b, a) => new Date(a.created).getTime() - new Date(b.created).getTime())
            .map(o => {
                const b = system.store.vehiclebudgets.find(r => r._id === o.budgetId);
                return Object.assign({
                    validity: b.summary.validity,
                    photo: system.db.models.find(m => m.id === b.model).src,
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


    view.destroy = function () {

    };

    return view;
}