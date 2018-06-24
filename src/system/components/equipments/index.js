import { HtmlView } from 'gml-html';
import template from './template.html';
import equipementsTemplate from './equipement.html';
import summarysTemplate from './summary.html';
import clientsTemplate from './client.html';
import * as style from './style.scss';
import { createModal } from '../../utils';
import selectModelTpl from './selectModel.html';
import modelsTpl from './models.html';
import { RetryRequest } from '../../../../modules/gml-http-request';

function sDisplay(id) {
    return id ? 'display: block;' : 'display: none;';
}

function getEquipFamilys(equipements) {
    return equipements
        .filter((e, i, a) => a.indexOf(a.find(f => f.equipmentFamily === e.equipmentFamily)) === i)
        .sort((a,b) => a.equipmentFamily.localeCompare(b.equipmentFamily));
}

function getBuilders(equipements) {
    return equipements
        .filter((e, i, a) => a.indexOf(a.find(f => f.constructorId === e.constructorId)) === i)
        .sort((a,b) => a.constructorId.localeCompare(b.constructorId));
}

const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

export default async function ({ system, locale }) {
    let { familys, models, versions, equipements } = system.db;

    const steps = ['equipements', 'summarys', 'clients'];
    const store = rx.create({
        equipment: system.getStorage('equipement').equipment || [],
        step: system.getStorage('equipement').step || 'equipements',
        filters: system.getStorage('equipement').filters || [],
        id: system.getStorage('equipement').id || ''
    });
    let equipementFamilys = getEquipFamilys(equipements);
    let builders = getBuilders(equipements);
    let offeredPrices = system.getStorage('equipement').offeredPrices || [];
    let client = Object.assign({
        name: '',
        address: '',
        email: '',
        pa: ''
    }, system.getStorage('equipement').client);
    let summary = Object.assign({
        payment: 'da concordare',
        availability: 'da definire',
        validity: '30'
    }, system.getStorage('equipement').summary);

    const view = HtmlView(template, style, store);
    const templates = {
        equipementsTemplate,
        summarysTemplate,
        clientsTemplate
    };

    const checks = {
        client: function () {
            const items = ['name', 'address', 'email'];
            const filled = items.filter(i => client[i]);
            if (filled.length !== 0 && filled.length !== items.length) {
                const key = items.filter(i => !client[i])[0];
                system.throw('missing-client-' + key);
                return false;
            }
            if (client.email && !emailRegEx.test(client.email)) {
                system.throw('missing-client-email-malformed');
                return false;
            }
            return true;
        }
    };

    //e_summary_price_{{this.id}}
    function checkPrices() {
        offeredPrices.forEach(function ({ id, value }) {
            const el = document.getElementById(`e_summary_price_${id}`);
            if (el) {
                const priceMin = equipements.find(e => e.id === id).priceMin;
                el.style.backgroundColor = 'rgba(0,255,0,0.2)';
                if (priceMin > Number(value)) {
                    el.style.backgroundColor = 'rgba(255,0,0,0.2)';
                }
            }
        });


    }

    function update(itemName, array, selectedId, step, titleSelected) {
        view.clear(itemName);
        view.get(`${itemName}title`).innerHTML = locale.get(`equipments.${itemName}.title`);
        if (steps.indexOf(itemName) <= steps.indexOf(step)) {
            array.forEach(function (item, index, ar) {
                const { id } = item;
                const selectedClass = selectedId.toString() === id.toString() ? '' : 'mdl-color-text--white mdl-color--grey-700';
                const gridNum = ar.length === 1 ? 12 : (ar.length === 2 ? 6 : 4);
                const variables = Object.assign({}, item, { itemName, selectedClass, gridNum });
                return view.appendTo(itemName, templates[`${itemName}Template`], [], variables);
            });
        }
        view.get(`${itemName}wrapper`).style.display = '';
        if (steps.indexOf(itemName) < steps.indexOf(step) && selectedId) {
            const innerText = locale.parse(locale.get(`vehicles.${itemName}.titleSelected`), titleSelected
                || array.find(i => i.id.toString() === selectedId.toString()).name);
            view.get(`${itemName}title`).innerText = innerText;
        } else if (steps.indexOf(itemName) > steps.indexOf(step)) {
            view.get(`${itemName}wrapper`).style.display = 'none';
        }
        view.get(`${itemName}wrapper`).style.height = step === itemName ? 'auto' : `50px`;
        view.get(`${itemName}wrapper`).style.overflow = step === itemName ? 'visible' : `hidden`;
    }

    const updateEquipments = update.partial('equipements');
    const updateSummarys = update.partial('summarys');
    const updateClients = update.partial('clients');

    async function refresh({ equipment, step, filters, id }) {
        view.style('');
        const arg1 = Object.assign({}, arguments[0], { equipementFamilys, builders });
        system.setStorage({
            equipement: Object.assign({ offeredPrices, client, summary }, arguments[0])
        });
        const itm = equipements
            .filter(() => filters.length !== 0)
            .filter(function (eq) {
                return filters.filter(f => {
                    if (f.property === 'compatibility') {
                        return eq[f.property].find(c => c.id === f.name);
                    }
                    return eq[f.property] === f.name;
                }).length === filters.length;
            });

        const selEquipment = equipements
            .filter(e => equipment.indexOf(e.id) !== -1)
            .map(i => Object.assign({}, i, { count: equipment.filter(id => id === i.id).length }));
        updateEquipments([Object.assign({}, arg1, {
            items: itm,
            equipments: selEquipment
        })], true, step, equipment.length.toString());
        const summaryItems = selEquipment.map(e => {
            const offeredPrice = offeredPrices.find(p => p.id === e.id);
            e.offeredPrice = offeredPrice ? offeredPrice.value : '';
            return e;
        });
        const summaryTitle = system.toCurrency(summaryItems.reduce((tot, i) => tot + Number(i.offeredPrice || i.priceReal), 0));
        updateSummarys([{ id: 0, summary, items: summaryItems }], true, step, summaryTitle);
        const updateButton = id && system.store.equipmentbudgets.find(i => !i.ordered && i._id === id);
        updateClients([{ id: 0, client, budgetId: id, on: sDisplay(updateButton), off: sDisplay(!updateButton) }], true, step);
        location.href = `#${step}`;
        setTimeout(checkPrices, 500);
        componentHandler.upgradeDom();
    }

    function reset() {
        offeredPrices.length = 0;
        client = { name: '', address: '', email: '', pa: '' };
        summary = {
            payment: 'da concordare',
            availability: 'da definire',
            validity: '30'
        };
        store.equipment.splice(0, store.equipment.length);
        store.filters.splice(0, store.filters.length);
        store.id = '';
        store.step = 'equipements';
    }

    rx.connect(store, refresh);

    const form = view.get();
    form.addFilter = function (property, id) {
        store.filters.push({ property, id: Math.round(Math.random() * 1e10), name: id });
    };
    form.step = function (name, check) {
        if (check && !checks[check]()) {
            return;
        }
        window.event.stopPropagation();
        store.step = name;
    };
    form.removeFilter = function (id) {
        const item = store.filters.find(i => i.id === id);
        store.filters.splice(store.filters.indexOf(item), 1);
    };
    form.selectVehicle = function () {
        const { modalView, modal } = createModal(selectModelTpl, {
            familys
        }, function (close) {
            close();
        });
        const modalForm = modalView.get('form');
        modalForm.change = function (id) {
            const ms = models.filter(m => m.familyId === id);
            modalView.clear('models').appendTo('models', modelsTpl, [], {
                models: ms
            });
        };
        modalForm.select = function (id) {
            store.filters.push({ property: 'compatibility', id: Math.round(Math.random() * 1e10), name: id });
            modalForm.close();
        };
    };

    form.addEquipment = function (id) {
        window.event.stopPropagation();
        store.equipment.push(id);
    };

    form.removeEquipment = function (id) {
        window.event.stopPropagation();
        store.equipment.splice(store.equipment.indexOf(id), 1);
    };

    form.updateSummary = function (id, value) {
        const find = offeredPrices.find(i => i.id === id);
        if (find) {
            find.value = value;
        } else {
            offeredPrices.push({ id, value });
        }
        checkPrices();
        const temp = system.getStorage('equipement');
        system.setStorage({ equipement: Object.assign(temp, { offeredPrices }) });
    };

    form.updateMainSummary = function(field, value) {
        summary[field] = value;
        const temp = system.getStorage('equipement');
        system.setStorage({ equipement: Object.assign(temp, { summary }) });
    };

    form.updateClient = function (name, value) {
        client[name] = value;
        const temp = system.getStorage('equipement');
        system.setStorage({ equipement: Object.assign(temp, { client }) });
    };

    form.save = (new Function()).debouncePromise().subscribe(async function (id) {
        if (checks.client()) {
            system.store.loading = true;
            const body = Object.assign({}, store, { client, summary, offeredPrices });
            if (id) {
                system.store.equipmentbudgets.splice(system.store.equipmentbudgets.find(i => i._id === id), 1);
                const res = await RetryRequest(`/api/rest/equipmentbudgets/${id}`, { headers: { 'Content-Type': 'application/json' } })
                    .send('PUT', JSON.stringify(body));
                system.store.equipmentbudgets.push(JSON.parse(res.responseText));
            } else {
                delete body.id;
                const res = await RetryRequest('/api/rest/equipmentbudgets', { headers: { 'Content-Type': 'application/json' } })
                    .post(JSON.stringify(body));
                system.store.equipmentbudgets.push(JSON.parse(res.responseText));
            }
            reset();
            system.store.loading = false;
            system.navigateTo('/it/preventivi');
        }
    });

    form.reset = function() {
        if (confirm('TUTTI I DATI INSERITI IN QUESTA PAGINA VERRANNO ELIMINATI. CONTINUARE?')) {
            reset()
        }
    };

    view.destroy = function () {

    };

    view.updateDb = function () {
        familys = system.db.familys;
        models = system.db.models;
        versions = system.db.versions;
        equipements = system.db.equipements;
        equipementFamilys = getEquipFamilys(equipements);
        builders = getBuilders(equipements);
        refresh(store);
    };

    view.updateFromItem = function (item) {
        store.id = item.id;
        offeredPrices = item.offeredPrices;
        client = item.client;
        summary = item.summary;
        rx.update(store, item);
        refresh(item);
    };

    view.createNew = function () {
        reset();
    };

    return view;
}