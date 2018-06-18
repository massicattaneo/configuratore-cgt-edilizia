import { HtmlView } from 'gml-html';
import template from './template.html';
import orderTpl from './order.html';
import vehicleSummary from './vehicleSummary.html';
import filesTpl from './files.html';
import * as style from './style.scss';
import { calculateEqOfferedTotal, calculateEqTotal, calculateTotal } from '../../../../web-app-deploy/shared';
import { RetryRequest } from '../../../../modules/gml-http-request';

export default async function ({ locale, system, thread }) {
    const view = HtmlView(template, style, locale.get());
    let subView;
    let budget;
    let id;
    let table;

    const store = rx.create({
        files: [],
        exchange: {
            overvalue: '',
            date: '',
            availability: '',
            documents: '',
            delivery: '',
            declaration: '',
            plate: '',
            mechanic: ''
        },
        leasing: {
            on: 'No',
            documents: '',
            approved: '',
            payment: ''
        },
        price: '',
        emailMe: ''
    });

    function refresh() {
        const userAuth = Number(system.store.userAuth);
        if (budget) {
            const family = system.db.familys.find(i => i.id === budget.family);
            const version = system.db.versions.find(i => i.id === budget.version);
            const isVehicle = !!budget.exchange;
            const equipmentsCount = budget.equipment.length ? `+ ${budget.equipment.length} ATTREZZATURE` : 'NESSUNA ATTREZZATURA';
            subView = view.clear().appendTo('', orderTpl, [], {
                version: version,
                family: family,
                model: system.db.models.find(i => i.id === budget.model),
                showLeasing: (isVehicle) ? 'block' : 'none',
                showExchange: (isVehicle && budget.exchange.name) ? 'block' : 'none',
                exchange: budget.exchange,
                priceReal: isVehicle
                    ? calculateTotal(budget, system.db, 'priceReal')
                    : calculateEqTotal(budget, system.db),
                priceOffered: isVehicle
                    ? budget.summary.price || calculateTotal(budget, system.db, 'priceReal')
                    : calculateEqOfferedTotal(budget, system.db),
                budget,
                table,
                id,
                title: isVehicle
                    ? `${family.name} - ${version.name} (${equipmentsCount})`
                    : `${budget.equipment.length} ATTREZZATURE`
            });

            const form = subView.get();

            form.uploadFile = async function () {
                system.store.loading = true;
                const file = await RetryRequest('/api/upload', { timeout: 30000 }).post(new FormData(this))
                    .catch(function (e) {
                        system.throw('generic-error');
                        system.store.loading = false;
                    });
                setTimeout(function () {
                    store.files.push(JSON.parse(file.responseText));
                    system.store.loading = false;
                }, 100);
            };

            form.removeFile = async function (id) {
                const file = store.files.find(f => f._id === id);
                if (file) {
                    await RetryRequest('/api/upload/' + id, {}).send('DELETE');
                    setTimeout(function () {
                        store.files.splice(store.files.indexOf(file), 1);
                    }, 100);
                }
            };

            form.updateStore = function (keys, value) {
                const split = keys.split('.');
                if (split.length === 1) {
                    store[keys] = value;
                } else {
                    const k = split.slice(0).splice(0, 1).reduce((s, i) => s[i], store);
                    k[split[split.length - 1]] = value;
                }
                updateValues();
            };

            form.save = async function (table, id) {
                system.store.loading = true;
                const mTable = table === 'vehiclebudgets' ? 'vehicleorders' : 'equipmentorders';
                const body = Object.assign({ budgetId: id }, store);
                const res = await RetryRequest(`/api/order/${mTable}`, { headers: { 'Content-Type': 'application/json' } })
                    .post(JSON.stringify(body));

                const b = system.store[table].find(g => g._id === id);
                system.store[table].splice(system.store[table].indexOf(b), 1);
                system.store[table].push(Object.assign({ ordered: true }, b));
                system.store[mTable].push(JSON.stringify(res));
                system.removeStorage(table === 'vehiclebudgets' ? 'vehicle' : 'equipement');
                system.store.loading = false;
                system.navigateTo(locale.get('urls.orders.href'));
            };

        }
        if (subView && subView.get('files')) {
            subView.clear('files').appendTo('files', filesTpl, [], { files: store.files });
        }
    }

    view.style();

    function updateValues() {
        const el = document.getElementById('leasing-wrapper');
        if (el)
            el.style.display = store.leasing.on === 'Si' ? 'inline' : 'none';
    }

    view.init = function (_table, _id) {
        table = _table;
        id = _id;
        budget = system.store[_table].find(i => i._id === _id);
        refresh(store);
        setTimeout(updateValues, 500);
    };

    view.destroy = function () {

    };

    if (location.search) {
        const table = location.search.match(/table=([^&]*)/)[1];
        const id = location.search.match(/id=([^&]*)/)[1];
        view.init(table, id);
    }

    return view;
}