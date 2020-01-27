const { confirmRegistrationUrl } = require('../../serverInfo');
const types = {
    1: 'CGT EDILIZIA',
    2: 'CGT',
    3: 'CONCESSIONARIO DIREZIONE',
    4: 'CONCESSIONARIO COMMERCIALE',
    5: 'OFFICINA'
};
module.exports = function({grayColor, type, tel, email, organization = '', workshop = '', name, primaryColor, host, activationCode, footer}) {
    return `
    <div style="font-family: Arial; color: ${grayColor}">
        <h1>UTENTE:</h1>
        <table>
            <tr>
                <td>
                    ORGANIZZAZIONE:
                </td>
                <td>
                    ${types[type]} ${organization !== '' ? `- ${organization}` : ''} ${workshop !== '' ? `- ${workshop}` : ''}
                </td>
            </tr>
            <tr>
                <td>
                    NOME:
                </td>
                <td>
                    ${name}
                </td>
            </tr>
            <tr>
                <td>
                    EMAIL:
                </td>
                <td>
                    ${email}
                </td>
            </tr>
            <tr>
                <td>
                    TELEFONO:
                </td>
                <td>
                    ${tel}
                </td>
            </tr>
        </table>
        <p>
            Seleziona il tipo ti utenza che vuoi assegnare a questo utente:
            <ul>
                <li>
                    <a style="color:${primaryColor}" href="${host}${confirmRegistrationUrl}?userAuth=0&activationCode=${activationCode}">
                        direzione vendite
                    </a>
                </li>
                <li>
                    <a style="color:${primaryColor}" href="${host}${confirmRegistrationUrl}?userAuth=1&activationCode=${activationCode}">
                        Funzionario vendite CGT edilizia
                    </a>
                </li>
                <li>
                    <a style="color:${primaryColor}" href="${host}${confirmRegistrationUrl}?userAuth=2&activationCode=${activationCode}">
                        Funzionario vendite CGT
                    </a>
                </li>
                <li>
                    <a style="color:${primaryColor}" href="${host}${confirmRegistrationUrl}?userAuth=3&activationCode=${activationCode}">
                        Concessionario Direzione
                    </a>
                </li>
                <li>
                    <a style="color:${primaryColor}" href="${host}${confirmRegistrationUrl}?userAuth=4&activationCode=${activationCode}">
                        Concessionario Commerciale
                    </a>
                </li>
                <li>
                    <a style="color:${primaryColor}" href="${host}${confirmRegistrationUrl}?userAuth=5&activationCode=${activationCode}">
                        Officina
                    </a>
                </li>
            </ul>
        </p>
        ${footer}
    </div>
                `
}
