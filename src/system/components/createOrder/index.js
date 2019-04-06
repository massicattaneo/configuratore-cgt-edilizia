import { HtmlView } from 'gml-html';
import template from './template.html';
import orderTpl from './order.html';
import filesTpl from './files.html';
import * as style from './style.scss';
import {
    calculateEqOfferedTotal,
    calculateEqTotal,
    calculateTotal, getPriceType,
    isOutsource
} from '../../../../web-app-deploy/shared';
import { RetryRequest } from '../../../../modules/gml-http-request';
import { showPriceSummaryList } from '../../utils';
import priceSummaryTpl from '../vehicles/priceSummary.html';

export default async function ({ locale, system, thread, gos }) {
    const view = HtmlView(template, style, locale.get());
    let subView;
    let budget;
    let id;
    let table;

    const store = rx.create({
        files: system.getStorage('orderFiles') || [],
        exchange: {
            cost: '',
            value: '',
            date: '',
            documents: '',
            delivery: '',
            declaration: '',
            plate: '',
            mechanic: ''
        },
        leasing: {
            on: 'No'
        },
        outsource: {
            campaign: '',
            transport: 'a nostra cura',
            payment: 'come concordato'
        },
        price: '',
        deliveryDate: '',
        emailMe: '',
        notes: ''
    });

    rx.connect({ orderFiles: () => store.files }, function ({ orderFiles }) {
        system.setStorage({ orderFiles });
    });

    function refresh() {
        const userAuth = Number(system.store.userAuth);
        if (budget) {
            const family = system.db.familys.find(i => i.id === budget.family);
            const version = system.db.versions.find(i => i.id === budget.version);
            const isVehicle = !!budget.exchange;
            const equipmentsCount = budget.equipment.length ? `+ ${budget.equipment.length} ATTREZZATURE` : 'NESSUNA ATTREZZATURA';
            const priceOffered = isVehicle
                ? budget.summary.price || calculateTotal(budget, system.db, 'priceReal')
                : calculateEqOfferedTotal(budget, system.db);
            const priceMin = isVehicle
                ? calculateTotal(budget, system.db, getPriceType(userAuth))
                : calculateEqTotal(budget, system.db, getPriceType(userAuth));
            subView = view.clear().appendTo('', orderTpl, [], {
                version: version,
                family: family,
                model: system.db.models.find(i => i.id === budget.model),
                showLeasing: (userAuth <= 1) ? 'block' : 'none',
                showExchange: (userAuth <= 1 && isVehicle && budget.exchange.name) ? 'block' : 'none',
                showExtendedOrder: (userAuth <= 1 && isVehicle) ? 'inline-block' : 'none',
                showOutsource: (isOutsource(userAuth)) ? 'inline-block' : 'none',
                exchange: budget.exchange,
                offeredPriceLabel: `return ${isOutsource(userAuth)} ? 'PREZZO CONCESSIONARIO' : 'PREZZO OFFERTO'`,
                priceReal: isVehicle
                    ? calculateTotal(budget, system.db, 'priceReal')
                    : calculateEqTotal(budget, system.db),
                priceOffered: isOutsource(userAuth) ? priceMin : priceOffered,
                budget,
                table,
                id,
                title: isVehicle
                    ? `${family.name} - ${version.name} (${equipmentsCount})`
                    : `${budget.equipment.length} ATTREZZATURE`
            });

            if (!store.price) {
                store.price = priceOffered;
            }

            const form = subView.get();

            form.removeFile = async function (id) {
                const file = store.files.find(f => f._id === id);
                if (file) {
                    system.store.loading = true;
                    await RetryRequest('/api/upload/' + id, {}).send('DELETE');
                    setTimeout(function () {
                        store.files.splice(store.files.indexOf(file), 1);
                        subView.clear('files').appendTo('files', filesTpl, [], { files: store.files });
                        system.store.loading = false;
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
            };

            form.uploadFile = async function () {
                system.store.loading = true;
                const file = await RetryRequest('/api/upload', { timeout: 60000 }).post(new FormData(this))
                    .catch(function (e) {
                        system.throw('generic-error');
                        system.store.loading = false;
                    });
                setTimeout(function () {
                    store.files.push(JSON.parse(file.responseText));
                    subView.clear('files').appendTo('files', filesTpl, [], { files: store.files });
                    system.store.loading = false;
                }, 100);
            };

            form.previewBudget = function (table, id) {
                window.open(`/api/pdf/budget/${table}/${id}`);
            };

            form.modifyBudget = function (table, id) {
                const item = Object.assign({}, system.store[table].find(i => i._id === id));
                if (table === 'vehiclebudgets') {
                    item.id = item._id;
                    delete item._id;
                    delete item.photo;
                    delete item.validity;
                    gos.vehicles.updateFromItem(item);
                    system.navigateTo('/it/configuratore-macchine?redirect=createOrder');
                } else {
                    item.id = item._id;
                    delete item._id;
                    gos.equipments.updateFromItem(item);
                    system.navigateTo('/it/configuratore-attrezzature?redirect=createOrder');
                }
            };

            form.save = async function (table, id) {
                if (!store.price) return system.throw('missingOrderPrice');
                if (!store.deliveryDate) return system.throw('missingDeliveryDate');
                system.store.loading = true;
                const mTable = table === 'vehiclebudgets' ? 'vehicleorders' : 'equipmentorders';
                const body = Object.assign({ budgetId: id }, store);
                const res = await RetryRequest(`/api/order/${mTable}`, { headers: { 'Content-Type': 'application/json' } })
                    .post(JSON.stringify(body));
                const b = system.store[table].find(g => g._id === id);
                system.store[table].splice(system.store[table].indexOf(b), 1);
                system.store[table].push(Object.assign({ ordered: true }, b));
                system.store[mTable].push(JSON.parse(res.responseText));
                system.store.loading = false;
                system.removeStorage('orderFiles');
                system.navigateTo(locale.get('urls.orders.href'));
            };

            form.showPriceList = function (table, id) {
                if (table !== 'vehiclebudgets') return;
                const budget = Object.assign({}, system.store[table].find(i => i._id === id));
                showPriceSummaryList(system, budget, budget.salecharges, budget.exchange, budget.summary, store.price, priceSummaryTpl);
            };
        }
        if (subView && subView.get('files')) {
            subView.clear('files').appendTo('files', filesTpl, [], { files: store.files });
        }
        componentHandler.upgradeDom();
    }

    view.style();

    view.init = function (_table, _id) {
        table = _table;
        id = _id;
        budget = system.store[_table].find(i => i._id === _id);
        rx.update(store, {
            files: system.getStorage('orderFiles') || [],
            exchange: {
                cost: '',
                value: '',
                date: '',
                documents: '',
                delivery: '',
                declaration: '',
                plate: '',
                mechanic: ''
            },
            leasing: {
                on: 'No'
            },
            outsource: {
                campaign: '',
                transport: 'a nostra cura',
                payment: 'come concordato'
            },
            price: '',
            deliveryDate: '',
            emailMe: '',
            notes: ''
        });
        if (budget.exchange) {
            store.exchange.cost = budget.exchange.cost;
            store.exchange.value = budget.exchange.value;
        }
        refresh(store);
    };

    view.destroy = function () {

    };

    if (location.search) {
        const match = location.search.match(/table=([^&]*)/);
        if (match) {
            const table = match[1];
            const id = location.search.match(/id=([^&]*)/)[1];
            view.init(table, id);
        }
    }

    return view;
}
