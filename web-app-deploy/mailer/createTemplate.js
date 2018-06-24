const { host, primaryColor, secondaryColor, grayColor, confirmRegistrationUrl, changePasswordUrl } = require('../serverInfo');
const footer = require('./footer.js');
const recover = require('./templates/recover');
const confirm = require('./templates/confirm');
const active = require('./templates/active');
const budget = require('./templates/budget');
const order = require('./templates/order');

module.exports = function (type, emailParams) {
    const email = emailParams.email;
    const params = Object.assign({}, emailParams,
        { host, primaryColor, secondaryColor, grayColor, confirmRegistrationUrl, changePasswordUrl, footer });
    switch (type) {
        case 'confirmEmail':
            return {
                to: 'samuele.albertini@cgtedilizia.it; carlotta.beccaro@cgtedilizia.it; francesco.cerizzi@cgtedilizia.it', // list of receivers
                // to: 'massi.cattaneo.it@gmail.com', // list of receivers
                // to: 'samuele.albertini@cgtedilizia.it', // list of receivers
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
                to: email,
                subject: emailParams.table === 'vehiclebudgets' ? 'OFFERTA MACCHINA NUOVA' : 'OFFERTA NUOVA ATTREZZATUR',
                text: '', // plain text body
                html: budget(params),
                attachments: emailParams.attachments
            };
        case 'order':
            return {
                // to: 'giovanna.pittelli@cgtedilizia.it;barbara.rizzuti@cgtedilizia.it;Vanessa.Aprigliano@cgtedilizia.it',
                to: 'massi.cattaneo.it@gmail.com;massi.cattaneo@alice.it',
                subject: `ORDINE ${emailParams.dbx.versions.find(v => v.id === emailParams.budget.version).name} per ${emailParams.budget.client.name}`,
                text: '', // plain text body
                html: order(params),
                attachments: emailParams.attachments
            }
    }
};