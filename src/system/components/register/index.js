import {HtmlView} from "gml-html";
import template from './template.html';
import * as style from './style.scss';
import registerDone from './register-done.html';

const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
const telRegEx = /^(\+34|0034|34)?[\s|\-|\.]?[6|7|9][\s|\-|\.]?([0-9][\s|\-|\.]?){8}$/;

export default async function ({ locale, system, thread }) {
    const view = HtmlView(template, style, locale.get());
    view.style();

    let form = view.get('wrapper');
    form.register = async function () {
        if (this.type.value === '') error({ text: 'missingOrganizationType', focus: '' });
        if (this.type.value === '3' && this.organization.value === '')
            error({text: 'missingOrganizationName', focus: 'organization'});
        if (this.name.value === '') error({ text: 'missingName', focus: 'name' });
        if (this.email.value === '') error({ text: 'missingEmail', focus: 'email' });
        if (!emailRegEx.test(this.email.value)) error({ text: 'malformedEmail', focus: 'email' });
        if (this.tel.value === '') error({ text: 'missingTel', focus: 'tel' });
        if (!telRegEx.test(this.tel.value)) error({ text: 'malformedTel', focus: 'tel' });
        if (this.password.value === '') error({ text: 'missingPassword', focus: 'password' });
        await register();
    };

    form.changeOrg = function () {
        view.get('organization').style.display = form.type.value === '3' ? 'block' : 'none';
    };

    view.destroy = function () {

    };

    function error({ text, focus }) {
        form[focus].focus();
        system.throw(text);
    }

    async function register() {
        system.store.loading = true;
        await thread.execute('user/register', {
            email: form.email.value,
            password: form.password.value,
            name: form.name.value,
            tel: form.tel.value,
            lang: system.info().lang,
            type: form.type.value,
            organization: form.type.value === '3' ? form.organization.value : ''
        });
        system.store.loading = false;
        view.clear().appendTo('', registerDone, [], locale.get());
    }

    return view;
}