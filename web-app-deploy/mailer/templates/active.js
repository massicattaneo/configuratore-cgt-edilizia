const { confirmRegistrationUrl } = require('../../serverInfo');
const types = {
    1: 'CGT EDILIZIA',
    2: 'CGT',
    3: 'CONCESSIONARIO'
};
module.exports = function({grayColor, type, organization, name, primaryColor, host, activationCode, footer}) {
    return `
    <div style="font-family: Arial; color: ${grayColor}">
        <p>
            Gentile ${name},<br/>
            La tua utenza e' ora attiva.
        </p>
        <p>
            Vai a questo link e inserisci la tua email e password ed inizia ad utilizzare i nostri servizi on-line.
            <br/>
            <a style="color:${primaryColor}" href="${host}/it/entra">
                CONFIGURATORE CGT EDILIZIA
            </a>
        </p>
        ${footer}
    </div>
                `
}