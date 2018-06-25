import { HtmlView } from 'gml-html';
import template from './template.html';
import * as style from './style.scss';
import familysTemplate from './family.html';
import modelsTemplate from './model.html';
import versionsTemplate from './version.html';
import equipementsTemplate from './equipement.html';
import exchangesTemplate from './exchange.html';
import summarysTemplate from './summary.html';
import clientsTemplate from './client.html';
import { RetryRequest } from '../../../../modules/gml-http-request';

const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

function sDisplay(id) {
    return id ? 'display: block;' : 'display: none;'
}

import { calculateTotal, getPriceType } from '../../../../web-app-deploy/shared';

export default async function ({ locale, system, thread }) {
    const view = HtmlView(template, style, locale.get());
    const steps = ['familys', 'models', 'versions', 'equipements', 'exchanges', 'summarys', 'clients'];
    const form = view.get('wrapper');
    const templates = {
        familysTemplate,
        modelsTemplate,
        versionsTemplate,
        equipementsTemplate,
        exchangesTemplate,
        summarysTemplate,
        clientsTemplate
    };
    let { familys, models, versions, equipements } = system.db;

    let store = rx.create(Object.assign({
        step: 'familys',
        family: '',
        model: '',
        version: '',
        equipment: [],
        selectedCategories: [],
        files: [],
        id: ''
    }, system.getStorage('vehicle')));
    let exchange = Object.assign({}, system.getStorage('vehicle').exchange);
    let summary = Object.assign({
        price: '',
        payment: 'da concordare',
        availability: 'da definire',
        validity: '30'
    }, system.getStorage('vehicle').summary);
    let client = Object.assign({
        name: '',
        address: '',
        email: '',
        pa: ''
    }, system.getStorage('vehicle').client);

    function checkPrice() {
        const el = document.getElementById('v_summary_price');
        if (el && system.store.userAuth <= 1) {
            const priceMin = calculateTotal(store, system.db, 'priceMin');
            el.style.backgroundColor = 'rgba(0,255,0,0.2)';
            if (priceMin > Number(summary.price)) {
                el.style.backgroundColor = 'rgba(255,0,0,0.2)';
            }
        }
    }

    function update(itemName, array, selectedId, step, titleSelected) {
        view.clear(itemName);
        view.get(`${itemName}title`).innerHTML = locale.get(`vehicles.${itemName}.title`);
        if (steps.indexOf(itemName) <= steps.indexOf(step)) {
            array.forEach(function (item, index, ar) {
                const { id } = item;
                const selected = sDisplay(selectedId.toString() === id.toString());
                const notSelected = sDisplay(selectedId.toString() !== id.toString());
                const gridNum = ar.length === 1 ? 12 : (ar.length === 2 ? 6 : 4);
                const variables = Object.assign({}, item, { itemName, selected, notSelected, gridNum, system: locale.get('system') });
                return view.appendTo(itemName, templates[`${itemName}Template`], [], variables);
            });
        }
        view.get(`${itemName}wrapper`).style.display = '';
        if (steps.indexOf(itemName) < steps.indexOf(step) && selectedId) {
            const innerText = locale.parse(locale.get(`vehicles.${itemName}.titleSelected`), titleSelected
                || (array.find(i => i.id.toString() === selectedId.toString()) || {}).name);
            view.get(`${itemName}title`).innerText = innerText;
        } else if (steps.indexOf(itemName) > steps.indexOf(step)) {
            view.get(`${itemName}wrapper`).style.display = 'none';
        }
        view.get(`${itemName}wrapper`).style.height = step === itemName ? 'auto' : `50px`;
        view.get(`${itemName}wrapper`).style.overflow = step === itemName ? 'visible' : `hidden`;
    }

    const updateFamilies = update.partial('familys');
    const updateModels = update.partial('models');
    const updateVersions = update.partial('versions');
    const updateEquipmentsFamilys = update.partial('equipements');
    const updateExchanges = update.partial('exchanges');
    const updateSummarys = update.partial('summarys');
    const updateClients = update.partial('clients');
    const remove = rx.connect(store, refresh);

    const checks = {
        exchange: function () {
            const items = ['name', 'builder', 'model', 'serial', 'year', 'value'];
            const filled = items.filter(i => exchange[i]);
            if (filled.length !== 0 && filled.length !== items.length) {
                const key = items.filter(i => !exchange[i])[0];
                system.throw('missing-exchange-vehicle-' + key);
                return false;
            }
            return true;
        },
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

    function removeFinalChar(string) {
        return string.substr(0, string.length - 1);
    }

    function reset() {
        exchange = {};

        summary = { price: '', payment: 'da concordare', availability: 'da definire', validity: '30' };
        client = { name: '', address: '', email: '', pa: '' };
        store.id = '';
        store.model = '';
        store.version = '';
        store.equipment.splice(0, store.equipment.length);
        store.selectedCategories.splice(0, store.selectedCategories.length);
        store.files.splice(0, store.files.length);
        store.step = 'familys';
    }

    form.step = function (name, check) {
        if (check && !checks[check]()) {
            return;
        }
        window.event.stopPropagation();
        store.step = name;
    };

    form.change = function (itemName, index) {
        window.event.stopPropagation();
        store.step = steps[steps.indexOf(itemName) + 1];
        let modelItemName = removeFinalChar(itemName);
        if (modelItemName === 'version' && store[modelItemName] !== index.toString()) {
            store.selectedCategories.length = 0;
            store.equipment.length = 0;
        }
        store[modelItemName] = index.toString();
        console.log(modelItemName);
    };

    form.addCategory = function (category) {
        window.event.stopPropagation();
        store.selectedCategories.push(category);
    };

    form.removeCategory = function (category) {
        window.event.stopPropagation();
        store.selectedCategories.splice(store.selectedCategories.indexOf(category), 1);
    };

    form.removeEquipment = function (id) {
        window.event.stopPropagation();
        store.equipment.splice(store.equipment.indexOf(id), 1);
    };

    form.addEquipment = function (id) {
        window.event.stopPropagation();
        store.equipment.push(id);
    };

    form.uploadExchange = async function () {
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

    form.removeExchange = async function (id) {
        const file = store.files.find(f => f._id === id);
        if (file) {
            await RetryRequest('/api/upload/' + id, {}).send('DELETE');
            setTimeout(function () {
                store.files.splice(store.files.indexOf(file), 1);
            }, 100);
        }
    };

    form.updateExchange = function (name, value) {
        exchange[name] = value;
    };

    form.updateSummary = function (name, value) {
        summary[name] = value;
        if (name === 'price') checkPrice();
    };

    form.updateClient = function (name, value) {
        client[name] = value;
        const temp = system.getStorage('vehicle');
        system.setStorage({ vehicle: Object.assign(temp, { client }) });
    };

    form.save = (new Function()).debouncePromise().subscribe(async function (id) {
        if (checks.client()) {
            system.store.loading = true;
            const body = Object.assign({}, store, { client, summary, exchange });
            if (id) {
                system.store.vehiclebudgets.splice(system.store.vehiclebudgets.find(i => i._id === id), 1);
                const res = await RetryRequest(`/api/rest/vehiclebudgets/${id}`, { headers: { 'Content-Type': 'application/json' } })
                    .send('PUT', JSON.stringify(body));
                system.store.vehiclebudgets.push(JSON.parse(res.responseText));
            } else {
                const res = await RetryRequest('/api/rest/vehiclebudgets', { headers: { 'Content-Type': 'application/json' } })
                    .post(JSON.stringify(body));
                system.store.vehiclebudgets.push(JSON.parse(res.responseText));
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

    function getCatregories(model, remove) {
        return equipements
            .filter(i => i.compatibility.filter(o => o.id === model).length)
            .map(i => i.equipmentFamily)
            .filter((item, pos, a) => a.indexOf(item) === pos)
            .filter(item => remove.indexOf(item) === -1)
            .sort();
    }

    function getSelectedEquipments(model, array) {
        return equipements
            .filter(i => i.compatibility.filter(o => o.id === model).length)
            .filter(i => array.indexOf(i.equipmentFamily) !== -1);
    }

    async function refresh({ family, model, version, files, step, equipment, selectedCategories, id }) {
        view.style('');
        system.setStorage({
            vehicle: {
                family,
                model,
                version,
                step,
                equipment,
                selectedCategories,
                files,
                exchange,
                summary,
                client,
                id
            }
        });
        updateFamilies(familys, family, step);
        updateModels(models.filter(i => i.familyId === family), model, step);
        updateVersions(versions.filter(i => i.modelId === model), version, step);
        const categories = getCatregories(model, selectedCategories);
        const selectedEquipments = getSelectedEquipments(model, selectedCategories);
        updateEquipmentsFamilys([{
            categories, selectedCategories, selectedEquipments, id: '',
            equipment: equipements
                .filter(e => equipment.indexOf(e.id) !== -1 && e.compatibility.filter(o => o.id === model).length)
                .map(i => Object.assign({}, i, { count: equipment.filter(id => id === i.id).length }))
        }], equipment, step, equipment.length.toString());
        let exchangeTitle = exchange.value ? `${exchange.name} - ${system.toCurrency(exchange.value)}` : 'NESSUNA PERMUTA';
        updateExchanges([{ id: 0, files, exchange }], true, step, exchangeTitle);
        if (!summary.price && step === 'summarys') {
            summary.price = calculateTotal({version, equipment}, system.db, getPriceType(system.store.userAuth))
        }
        updateSummarys([{
            id: 0,
            model: models.find(f => f.id === model),
            family: familys.find(f => f.id === family),
            version: versions.find(f => f.id === version),
            equipment,
            summary,
            price: calculateTotal({version, equipment}, system.db),
            selExchange: exchange.name
                ? `<div>PERMUTA: ${exchange.name} (${exchange.builder}) - ${system.toCurrency(exchange.value)}</div><br/>`
                : 'NESSUNA PERMUTA',
            selEquipments: equipment.length
                ? `<div>ATTREZZATURE:</div><ul><li>${equipment
                    .map(id => {
                        const find = equipements.find(e => e.id == id);
                        return `${find.code}${find.name} - ${system.toCurrency(find.priceReal)}`
                    })
                    .join('</li><li>')}</li></ul>`
                : 'NESSUNA ATTREZZATURA SELEZIONATA'
        }], true, step, system.toCurrency(summary.price || calculateTotal({version, equipment}, system.db)));
        const updateButton = id && system.store.vehiclebudgets.find(i => !i.ordered && i._id === id);
        updateClients([{ id: 0, client, budgetId: id, on: sDisplay(updateButton), off:  sDisplay(!updateButton)}], true, step, summary.price);
        location.href = `#${step}`;
        setTimeout(checkPrice, 500);
        componentHandler.upgradeDom();
    }

    view.destroy = function () {
        remove();
    };

    view.updateDb = function () {
        familys = system.db.familys;
        models = system.db.models;
        versions = system.db.versions;
        equipements = system.db.equipements;
        refresh(store);
    };

    view.updateFromItem = function (item) {
        store.id = item._id;
        rx.update(store, item);
        exchange = item.exchange;
        summary = item.summary;
        client = item.client;
        refresh(item);
    };

    view.createNew = function() {
        reset();
    };

    return view;
}
