module.exports = function ({ grayColor, primaryColor, host, footer, order }) {
    return `
    <div style="font-family: Arial; color: ${grayColor}">
        <p>
            Ordine eliminato: ${order}
        </p>
        ${footer}
    </div>
`;
};