
module.exports = function({grayColor, primaryColor, host, footer, table, budget, user, dbx}) {
    const retailer = dbx.retailers.find(r => r.id === user.organization);
    return `
    <div style="font-family: Arial; color: ${grayColor}">
        <p>
            Spett.le ${budget.client.name}<br/>
            Alla Cortese Attenzione Sig. ${budget.client.pa}
        </p>
        <p>
            In allegato puo' trovare il dettaglio dell'offerta da Lei richiesta.
        </p>
        <p>
            Cordiali Saluti
        </p>
        ${user.type == '3' ? `<br/><hr/><br/>
            <img width="600px" src="${host}${retailer.src}"/>
            <br/><strong>${retailer.name}</strong>` : ""}
        ${user.type == '2' ? `<br/><hr/><br/>
            <img width="200px" src="${host}/assets/images/logo-cgt.png"/>
            <br/><strong>Compagnia Generale Trattori S.p.A.</strong>` : ""}
        ${user.type == '1' ? footer : ""}
    </div>
`
};