
module.exports = function({grayColor, primaryColor, host, footer, table, shopOrder, user}) {
    return `
    <div style="font-family: Arial; color: ${grayColor}">
        <p>Grazie per il suo oridine ${user.name}.</p>
        <p>Numero ordine: ${shopOrder.orderNumber}</p>
        <p>Qui un breve riepilogo:</p>
        <table width="100%">
            <thead>
                <tr>
                    <td><strong>PRODOTTO</strong></td>
                    <td><strong>TAGLIA</strong></td>
                    <td><strong>GENERE</strong></td>
                    <td><strong>QUANTITA'</strong></td>
                </tr>
            </thead>
            <tbody>
            ${shopOrder.cart.map(({ shopItem, seller, emails, gender, size, quantity }, index) => {
               return `
                <tr style="background-color: ${index % 2 === 0 ? '#eeeeee' : ''}">
                    <td>${shopItem.id} ${shopItem.name}</td>
                    <td>${size}</td>
                    <td>${gender}</td>
                    <td>${quantity}</td>
                </tr>` 
    }).join('')}
            </tbody>
        </table>
        <p>Cordiali saluti.</p>
        ${footer}
    </div>
`
};
