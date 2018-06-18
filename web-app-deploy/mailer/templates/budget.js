
module.exports = function({grayColor, primaryColor, host, footer, table, budget, user}) {
    return `
    <div style="font-family: Arial; color: ${grayColor}">
        <p>
            Spett.le ${budget.client.name}<br/>
            Alla Cortese Attenzione Sig. ${budget.client.pa}
        </p>
        <p>
            In allegato puo' trovare il dettaglio dell'offerta da Lei rischiesta.
        </p>
        <p>
            Cordiali Saluti
        </p>
        ${footer}
    </div>
`
};