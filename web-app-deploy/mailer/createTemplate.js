const { host, primaryColor, secondaryColor, grayColor, confirmRegistrationUrl, changePasswordUrl } = require('../serverInfo');
const footer = require('./footer.js');
const recover = require('./templates/recover');
const confirm = require('./templates/confirm');
const active = require('./templates/active');
const budget = require('./templates/budget');
const order = require('./templates/order');
const orderDelete = require('./templates/orderDelete');
const webmail = require('../private/webmail');
const emailsAddresses = require('../private/emails');

module.exports = function (type, emailParams) {
    const email = emailParams.email;
    const params = Object.assign({}, emailParams,
        { host, primaryColor, secondaryColor, grayColor, confirmRegistrationUrl, changePasswordUrl, footer });
    switch (type) {
    case 'confirmEmail':
        return {
            to: emailsAddresses.confirmEmail, // list of receivers
            subject: 'CONFIGURATORE CGT - CREAZIONE UTENZA', // Subject line
            text: '', // plain text body
            html: confirm(params)
        };
    case 'activeUser':
        return {
            to: email, // list of receivers
            subject: 'CONFIGURATORE CGT - ATTIVAZIONE UTENZA', // Subject line
            text: '', // plain text body
            html: active(params)
        };
    case 'recoverEmail':
        return {
            to: email, // list of receivers
            subject: 'CONFIGURATORE CGT - CAMBIA LA PASSWORD ', // Subject line
            text: '', // plain text body
            html: recover(params)
        };
    case 'budget':
        return {
            from: `"${emailParams.user.surname} ${emailParams.user.name}" <${webmail.email}>`,
            to: email,
            subject: emailParams.table === 'vehiclebudgets' ? 'OFFERTA MACCHINA NUOVA' : 'OFFERTA NUOVA ATTREZZATURA',
            text: '', // plain text body
            html: budget(params),
            attachments: emailParams.attachments
        };
    case 'order':
        return {
            to: email,
            subject: `ORDINE per ${emailParams.budget.client.name}`,
            text: '', // plain text body
            html: order(params),
            attachments: emailParams.attachments
        };
    case 'order-delete':
        return {
            to: email,
            subject: `ELIMINAZIONE ORDINE`,
            text: '', // plain text body
            html: orderDelete(params),
            attachments: []
        };
    case 'internal-error':
        return {
            to: emailsAddresses.internalErrors,
            subject: `ERRORE NEL DATABASE`,
            text: '', // plain text body
            html: `CONTROLLA QUESTO: ${emailParams.message}`,
            attachments: []
        };
    }
};