const { urls } = require('../../serverInfo');

module.exports = function({grayColor, name, greenColor: primaryColor, host, activationCode, footer}) {
    return `
    <div style="font-family: Arial; color: ${grayColor}">
        <h1>Bentornato ${name}!</h1>
        <p>
            Per favore fai
            <a style="color:${primaryColor}" href="${host}${urls.resetUrl}?activationCode=${activationCode}">
            click qui
            </a>
            percambiare la tua password.
        </p>
        ${footer}
    </div>
                `
}