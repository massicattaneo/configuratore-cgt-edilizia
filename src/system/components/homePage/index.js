import { HtmlView } from 'gml-html';
import template from './template.html';
import adminTpl from './admin.html';
import noAdminTpl from './noAdmin.html';
import * as style from './style.scss';
import { RetryRequest } from '../../../../modules/gml-http-request';

export default async function ({ locale, system }) {
    const view = HtmlView(template);

    const model = rx.create({
        filter: '',
        order: 'surname'
    });

    view.get().filter = function (el) {
        model.filter = el.value;
    };
    view.get().sort = function (column) {
        model.order = column;
    };
    view.get().save = async function (id, value) {
        system.store.loading = true;
        await RetryRequest(`/api/rest/users/${id}`, { headers: { 'Content-Type': 'application/json' } })
            .send('PUT', JSON.stringify({userAuth: Number(value)}));
        system.throw('custom', {message: 'Utenza aggiornata'});
        system.store.loading = false;
    };
    view.get().active = async function (id, value) {
        system.store.loading = true;
        await RetryRequest(`/api/rest/users/${id}`, { headers: { 'Content-Type': 'application/json' } })
            .send('PUT', JSON.stringify({active: value === '1'}));
        system.throw('custom', {message: 'Utenza aggiornata'});
        system.store.loading = false;
    };

    rx.connect
        .partial({
            a: () => system.store.userAuth,
            logged: () => system.store.hasLogged
        })
        .execute(() => view.clear('filter'))
        .filter(({a}) => a !== undefined && a.toString() === '0')
        .subscribe(function () {
            view.appendTo('filter', `<div>
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
            order: () => model.order
        })
        .subscribe(redraw);

    let users;

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
        if (user.organization.toLowerCase().indexOf(model.filter.toLowerCase()) !== -1) return true;
        return false;
    }

    function sortUsers(a, b) {
        return a[model.order].localeCompare(b[model.order]);
    }

    async function redraw({ userAuth, filter, order }) {
        view.clear('list');
        if (userAuth !== undefined && userAuth.toString() === '0') {
            view.appendTo('list', '<h5>CARICANDO LISTA UTENTI ...</h5>', style);
            const us = (await getUsers())
                .filter(filterUsers)
                .sort(sortUsers)
                .map(u => Object.assign({
                    select: `<select onchange="this.form.save('${u._id}', this.value)">
                    <option value="0" ${u.userAuth.toString() === '0' ? 'selected' : ''}>DIREZIONE</option>
                    <option value="2" ${u.userAuth.toString() === '1' ? 'selected' : ''}>CGT EDILIZIA</option>
                    <option value="1" ${u.userAuth.toString() === '2' ? 'selected' : ''}>CGT</option>
                    <option value="3" ${u.userAuth.toString() === '3' ? 'selected' : ''}>CONCESSIONARI</option>
                </select>`,
                activeSelect: `<select onchange="this.form.active('${u._id}', this.value)">
                    <option value="0" ${u.active === false ? 'selected' : ''}>DISATTIVO</option>
                    <option value="1" ${u.active === true ? 'selected' : ''}>ATTIVO</option>
                </select>`
                }, u));
            view.clear('list').appendTo('list', adminTpl, style, { users: us });
        } else {
            view.appendTo('list', noAdminTpl, style, locale.get());
        }
    }


    view.destroy = function () {

    };

    return view;
}