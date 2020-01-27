import { HtmlView } from 'gml-html';
import template from './template.html';
import * as style from './style.scss';
import registerDone from './register-done.html';
import { isOutsource, isWorkshop } from '../../../../web-app-deploy/shared';

const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
const telRegEx = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im;

export default async function ({ locale, system, thread }) {
    const view = HtmlView(template, style, Object.assign(locale.get(), { organizations: system.db.retailers }));

    view.style();

    let form = view.get('wrapper');
    form.register = async function () {
        if (this.type.value === '') error({ text: 'missingOrganizationType', focus: '' });
        if (isOutsource(this.type.value) && this.organization.value === '')
            error({ text: 'missingOrganizationName', focus: 'organization' });
        if (isWorkshop(this.type.value) && this.workshop.value === '')
            error({ text: 'missingWorkshopName', focus: 'workshop' });
        if (this.name.value === '') error({ text: 'missingName', focus: 'name' });
        if (this.surname.value === '') error({ text: 'missingSurname', focus: 'surname' });
        if (this.email.value === '') error({ text: 'missingEmail', focus: 'email' });
        if (!emailRegEx.test(this.email.value)) error({ text: 'malformedEmail', focus: 'email' });
        if (this.tel.value === '') error({ text: 'missingTel', focus: 'tel' });
        if (!telRegEx.test(this.tel.value)) error({ text: 'malformedTel', focus: 'tel' });
        if (this.password.value === '') error({ text: 'missingPassword', focus: 'password' });
        await register();
    };

    form.changeOrg = function () {
        view.get('workshop').style.display = isWorkshop(form.type.value) ? 'block' : 'none';
        view.get('organization').style.display = isOutsource(form.type.value) ? 'block' : 'none';
    };

    view.destroy = function () {

    };

    function error({ text, focus }) {
        focus && form[focus].focus();
        system.throw(text);
    }

    async function register() {
        system.store.loading = true;
        await thread.execute('user/register', {
            email: form.email.value.toLowerCase(),
            password: form.password.value,
            name: form.name.value,
            surname: form.surname.value,
            tel: form.tel.value,
            lang: system.info().lang,
            type: form.type.value,
            discount: 0,
            workshop: isWorkshop(form.type.value) ? form.workshop.value : '',
            organization: isOutsource(form.type.value) ? form.organization.value : ''
        });
        system.store.loading = false;
        view.clear().appendTo('', registerDone, [], locale.get());
    }

    return view;
}
