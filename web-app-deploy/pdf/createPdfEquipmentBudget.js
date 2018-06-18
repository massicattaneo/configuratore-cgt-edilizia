const PdfDoc = require('pdfkit');
const path = require('path');
const loc = require('../static/localization/system/it.json');
const { calculateTotal } = require('../shared');
const {addHeader, getLongDate, toCurrency} = require('./addHeader');

module.exports = function createPdfOrder(res, budget, dbx, user) {
    const doc = new PdfDoc();
    doc.pipe(res);

    const docWidth = 612;

    // doc.info = {
    //     Title: '',
    //     Author: '',
    //     Subject: '',
    //     CreationDate: '',
    // };

    const marginLeft = 30;
    const bodyLineHeight = 14;
    const spettMarginLeft = 300;
    let pos = addHeader(user, doc);

    /** SPETT.LE */
    doc
        .fillColor('black')
        .fontSize(10)
        .text('Spett.le', spettMarginLeft, (pos += 40))
        .text(budget.client.name || '', spettMarginLeft, (pos += 20))
        .text(budget.client.address || '', spettMarginLeft, (pos += bodyLineHeight))

    /** Date */
    const date = new Date(budget.modified || budget.created);
    doc
        .text(`${getLongDate(date)}`, marginLeft, (pos += 50))
        .text(`Alla Cortese Attenzione Sig. ${budget.client.pa}`, marginLeft, (pos += 30))

    /** Subject */
    doc
        .font('Helvetica-Bold')
        .text('Oggetto: OFFERTA ATTREZZATURE NUOVE', marginLeft, (pos += 30))
        .font('Helvetica')
        .text('A seguito di Vs. gradita richiesta, Vi sottoponiamo nostra migliore offerta commerciale come di seguito descritto:', marginLeft, (pos += 30))
        .font('Helvetica-Bold');

    budget.equipment.forEach((eqId, index) => {

    });

    // pos += 60;
    // doc
    //     .rect(marginLeft, pos, docWidth - (marginLeft * 2), 24)
    //     .stroke('black')
    //     .font('Helvetica-Bold')
    //     .text('PREZZO DI LISTINO', marginLeft + 20, (pos += 8))
    //     .text(toCurrency(calculateTotal(budget, dbx)), marginLeft + 250, pos, { align: 'right', width: 200 });
    //
    // pos+=20;
    // doc
    //     .rect(marginLeft, pos, docWidth - (marginLeft * 2), 24)
    //     .stroke('black')
    //     .font('Helvetica-Bold')
    //     .text('PREZZO NETTO A VOI RISERVATO', marginLeft + 20, (pos += 8))
    //     .text(toCurrency(budget.summary.price || calculateTotal(budget, dbx)), marginLeft + 250, pos, { align: 'right', width: 200 });
    //
    // pos +=20;
    // doc.fontSize(9);
    // const summary = {
    //     payment: 'Pagamento',
    //     availability: 'Disponibilità',
    //     validity: 'Validità'
    // };
    // Object.keys(summary).forEach(function (key) {
    //     if (budget.summary[key])
    //         doc
    //             .font('Helvetica')
    //             .text(`${summary[key]}:`, marginLeft, (pos += 11))
    //             .text(budget.summary[key] + (key === 'validity' ? 'gg': ''), marginLeft + 100, pos);
    // });
    //
    // doc.text('Restiamo a disposizione per ogni chiarimento e con l’occasione Vi inviamo i ns più Cordiali Saluti.', marginLeft, (pos +=20));
    //
    // doc.text(`${user.name} ${user.surname || ''}`, 200, (pos+=30), {align: 'center'});
    // doc.text(`${user.email} - ${user.tel}`, 200, (pos+=13), {align: 'center'});
    // doc.font('Helvetica-Bold').text((user.type == 3) ? (user.organization || '') : 'CGT Edilizia Spa', 200, (pos+=13), {align: 'center'});

    doc.end();
};
