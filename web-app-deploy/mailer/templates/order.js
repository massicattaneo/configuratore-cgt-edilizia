
module.exports = function({grayColor, primaryColor, host, footer, table, budget, user}) {
    return `
    <div style="font-family: Arial; color: ${grayColor}">
        <p>
            Nuovo ordine effettuato da ${user.name} ${user.surname}
        </p>
        ${footer}
    </div>
`
};