const PdfDoc = require('pdfkit');
const path = require('path');
const sizeOf = require('image-size');
const loc = require('../static/localization/system/it.json');
const { isOutsource, calculateLeasing, convertNumber } = require('../shared');
const { addHeader, getLongDate, toCurrency, toPercentage, getClientAddress } = require('./addHeader');

module.exports = function createPdfOrder(res, budget, dbx, user) {
    const doc = new PdfDoc({
        info: {
            Title: `CALCOLO FINANZIAMENTO LEASING - ${budget.client.name || ''}`,
            Author: 'CGT EDILIZIA'
        }
    });
    const retailer = dbx.retailers.find(r => r.id === user.organization) || {};

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
    let pos = addHeader(user, doc, dbx);

    /** SPETT.LE */
    doc.y = 110;
    doc
        .fillColor('black')
        .fontSize(10)
        .text('Spett.le', spettMarginLeft);
    doc.y += 5;
    doc.text(budget.client.name || '', spettMarginLeft)
        .text(getClientAddress(budget.client), spettMarginLeft);
    pos = 154;

    /** Date */
    const date = new Date(budget.modified || budget.created);
    doc
        .text(`${getLongDate(date)}`, marginLeft, (pos += 50))
        .text(`Alla Cortese Attenzione Sig. ${budget.client.pa}`, marginLeft, (pos += 30));

    /** Subject */
    doc
        .font('Helvetica-Bold')
        .text('Oggetto: CALCOLO FINANZIAMENTO LEASING', marginLeft, (pos += 30))
        .font('Helvetica')
        .text('A seguito di Vs. gradita richiesta, Vi sottoponiamo nostra migliore offerta per finanziamento leasing:', marginLeft, (pos += 30));

    pos += 20;

    const leasingCalculation = calculateLeasing(budget.leasing);

    doc
        .text(`Finanziamento: ${budget.leasing.emitter} ${budget.leasing.installments} mesi`, marginLeft, pos += 15);

    pos += 20;

    doc
        .text('Import totale finanziamento:', marginLeft, pos += 15)
        .text(`${toCurrency(leasingCalculation.loanPrice)} + IVA`, marginLeft + 200, pos, { align: 'right', width: 150 });

    pos += 10;
    doc
        .text('Tasso:', marginLeft, pos += 15)
        .text(`${toPercentage(leasingCalculation.rate)}`, marginLeft + 100, pos, { align: 'right', width: 50 });

    doc
        .text('Anticipo:', marginLeft, pos += 15)
        .text(`${toPercentage(convertNumber(budget.leasing.prePayment))}`, marginLeft + 100, pos, { align: 'right', width: 50 })
        .text(`${toCurrency(leasingCalculation.loanPrice * (convertNumber(budget.leasing.prePayment)/100))} + IVA`, marginLeft + 200, pos, { align: 'right', width: 150 });

    doc
        .text('N. Rate:', marginLeft, pos += 15)
        .text(`${leasingCalculation.installments}`, marginLeft + 100, pos, { align: 'right', width: 50 });

    doc
        .text('Importo singola rata:', marginLeft, pos += 15)
        .text(`${toCurrency(leasingCalculation.installmentPrice)} + IVA`, marginLeft + 200, pos, { align: 'right', width: 150 });

    doc
        .text('Importo totale rate:', marginLeft, pos += 15)
        .text(`${toCurrency(leasingCalculation.totalInstallmentPrice)} + IVA`, marginLeft + 200, pos, { align: 'right', width: 150 });

    doc
        .text('Riscatto finale:', marginLeft, pos += 15)
        .text(`${toPercentage(convertNumber(budget.leasing.finalPayment))}`, marginLeft + 100, pos, { align: 'right', width: 50 })
        .text(`${toCurrency(leasingCalculation.finalPayment)} + IVA`, marginLeft + 200, pos, { align: 'right', width: 150 });

    pos += 20;

    doc
        .text('TOTALE CANONI:', marginLeft, pos += 15)
        .text(`${toCurrency(leasingCalculation.totalPrice)} + IVA`, marginLeft + 200, pos, { align: 'right', width: 150 });

    pos += 20;

    doc
        .text('Spese contrattuali:', marginLeft, pos += 15)
        .text(`${toCurrency(convertNumber(budget.leasing.contractualExpenses))} + IVA`, marginLeft + 200, pos, { align: 'right', width: 150 });
    doc
        .text('Assicurazione obbligatoria (per rata):', marginLeft, pos += 15)
        .text(`${toCurrency(convertNumber(budget.leasing.insurance))} + IVA`, marginLeft + 200, pos, { align: 'right', width: 150 });

    pos += 20;
    doc.text('Restiamo a disposizione per ogni chiarimento e con l’occasione Vi inviamo i ns più Cordiali Saluti.', marginLeft, (pos += 20));

    doc.text(`${user.name} ${user.surname || ''}`, 200, (pos += 30), { align: 'center' });
    doc.text(`${user.email} - ${user.tel}`, 200, (pos += 13), { align: 'center' });
    if (user.type == 1) doc.font('Helvetica-Bold').text('CGT Edilizia Spa', 200, (pos += 13), { align: 'center' });
    if (user.type == 2) doc.font('Helvetica-Bold').text('Compagnia Generale Trattori S.p.A.', 200, (pos += 13), { align: 'center' });
    if (isOutsource(user.type)) doc.font('Helvetica-Bold').text(retailer.name || '', 200, (pos += 13), { align: 'center' });

    doc.end();
};
