import { HtmlView } from 'gml-html';
import template from './template.html';
import adminTpl from './admin.html';
import noAdminTpl from './noAdmin.html';
import workshopTpl from './workshop.html';
import * as style from './style.scss';
import { RetryRequest } from '../../../../modules/gml-http-request';
import { isOutsource } from '../../../../web-app-deploy/shared';

function getOrganizationSelect(item, system) {
    if (item.workshop) return `${item.workshop}`;
    return `<select style="width: 180px;" onchange="this.form.updateRetailer('${item._id}', this.value)"
                        ${isOutsource(item.type) ? '' : 'disabled'}>
                    <option value=""></option>
                    ${system.db.retailers.map(r =>
        `<option ${r.id === item.organization ? 'selected' : ''} 
                            value="${r.id}">${r.name}</option>`).join('')}
                </select>`;
}

export default async function ({ locale, system }) {
    const view = HtmlView(template);
    let users;
    let content;

    const model = rx.create({
        filter: '',
        order: 'surname',
        ascending: true
    });

    view.get().filter = function (el) {
        model.filter = el.value;
    };
    view.get().sort = function (column) {
        if (model.order === column) model.ascending = !model.ascending;
        model.order = column;
    };
    view.get().save = async function (id, value) {
        system.store.loading = true;
        const newValues = {
            userAuth: Number(value),
            type: Math.max(Number(value), 1)
        };
        await RetryRequest(`/api/rest/users/${id}`, { headers: { 'Content-Type': 'application/json' } })
            .send('PUT', JSON.stringify(newValues));
        Object.assign(users.find(u => u._id === id), newValues);
        await redraw();
        system.throw('custom', { message: 'Utenza aggiornata' });
        system.store.loading = false;
    };
    view.get().active = async function (id, value) {
        system.store.loading = true;
        const newValues = { active: value === '1' };
        await RetryRequest(`/api/rest/users/${id}`, { headers: { 'Content-Type': 'application/json' } })
            .send('PUT', JSON.stringify(newValues));
        Object.assign(users.find(u => u._id === id), newValues);
        await redraw();
        system.throw('custom', { message: 'Utenza aggiornata' });
        system.store.loading = false;
    };
    view.get().updateRetailer = async function (id, value) {
        system.store.loading = true;
        const newValues = { organization: value };
        await RetryRequest(`/api/rest/users/${id}`, { headers: { 'Content-Type': 'application/json' } })
            .send('PUT', JSON.stringify(newValues));
        Object.assign(users.find(u => u._id === id), newValues);
        await redraw();
        system.throw('custom', { message: 'Utenza aggiornata' });
        system.store.loading = false;
    };
    view.get().block = function (bool) {
        content.get('table').className = bool ? 'alternate-table blocks' : 'alternate-table';
    };

    rx.connect
        .partial({
            a: () => system.store.userAuth,
            logged: () => system.store.hasLogged
        })
        .execute(() => view.clear('filter'))
        .filter(({ a }) => a !== undefined && a.toString() === '0')
        .subscribe(function () {
            view.appendTo('filter', `<div>
            <fieldset class="mdl-color-text--blue-grey-400 material-icons"
                    onclick="this.form.block(true)"
                    style="font-size: 38px; cursor: pointer;vertical-align: middle;" role="presentation">view_module
            </fieldset>
            <span>&nbsp;</span>
            <fieldset class="mdl-color-text--blue-grey-400 material-icons"
                    onclick="this.form.block(false)"
                    style="font-size: 38px; cursor: pointer;vertical-align: middle;" role="presentation">view_list
            </fieldset>
                <label for="user-filter">FILTRA:</label>
                <input autocomplete="off" type="text" onkeyup="this.form.filter(this)" id="user-filter" style="width: 200px"/>
            <hr/>
            </div>`, []);
        });

    rx.connect
        .partial({
            userAuth: () => system.store.userAuth,
            logged: () => system.store.hasLogged,
            filter: () => model.filter,
            ascending: () => model.ascending,
            order: () => model.order
        })
        .subscribe(redraw);

    async function getUsers() {
        if (users) return users;
        const res = await RetryRequest(`/api/rest/users`, {}).get();
        users = JSON.parse(res.responseText);
        return users;
    }

    function filterUsers(user) {
        if (user.name.toLowerCase().indexOf(model.filter.toLowerCase()) !== -1) return true;
        if (user.surname.toLowerCase().indexOf(model.filter.toLowerCase()) !== -1) return true;
        if (user.email.toLowerCase().indexOf(model.filter.toLowerCase()) !== -1) return true;
        return false;
    }

    function sortUsers(a, b) {
        if (model.ascending) return b[model.order].localeCompare(a[model.order]);
        return a[model.order].localeCompare(b[model.order]);
    }

    async function redraw() {
        const userAuth = system.store.userAuth;
        view.clear('list');
        if (userAuth !== undefined && userAuth.toString() === '0') {
            view.appendTo('list', '<h5>CARICANDO LISTA UTENTI ...</h5>', style);
            const us = (await getUsers())
                .filter(filterUsers)
                .sort(sortUsers)
                .map(u => Object.assign({
                    select: `<select onchange="this.form.save('${u._id}', this.value)">
                    <option value="0" ${u.userAuth.toString() === '0' ? 'selected' : ''}>DIREZIONE</option>
                    <option value="1" ${u.userAuth.toString() === '1' ? 'selected' : ''}>CGT EDILIZIA</option>
                    <option value="2" ${u.userAuth.toString() === '2' ? 'selected' : ''}>CGT</option>
                    <option value="3" ${u.userAuth.toString() === '3' ? 'selected' : ''}>CONCESSIONARIO DIREZIONE</option>
                    <option value="4" ${u.userAuth.toString() === '4' ? 'selected' : ''}>CONCESSIONARIO COMMERCIALE</option>
                    <option value="5" ${u.userAuth.toString() === '5' ? 'selected' : ''}>OFFICINA</option>
                </select>`,
                    activeSelect: `<select onchange="this.form.active('${u._id}', this.value)">
                    <option value="0" ${u.active === false ? 'selected' : ''}>DISATTIVO</option>
                    <option value="1" ${u.active === true ? 'selected' : ''}>ATTIVO</option>
                </select>`,
                    organizationSelect: getOrganizationSelect(u, system)
                }, u));
            const orders = ['created', 'name', 'surname', 'organization'].reduce((ret, key) => {
                const item = {};
                item[`sort_${key}`] = model.order === key ? `mdl-data-table__header--sorted-${model.ascending ? 'ascending' : 'descending'}` : '';
                return Object.assign(ret, item);
            }, {});
            content = view.clear('list').appendTo('list', adminTpl, style, Object.assign({ users: us }, orders));
        } else if (userAuth !== undefined && userAuth.toString() === '5') {
            view.appendTo('list', workshopTpl, style, locale.get());
        } else if (userAuth !== undefined) {
            view.appendTo('list', noAdminTpl, style, locale.get());
        }
    }


    view.destroy = function () {

    };

    return view;
}
