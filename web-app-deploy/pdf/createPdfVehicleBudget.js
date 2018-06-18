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
        .text('Oggetto: OFFERTA MACCHINA NUOVA', marginLeft, (pos += 30))
        .font('Helvetica')
        .text('A seguito di Vs. gradita richiesta, Vi sottoponiamo nostra migliore offerta commerciale come di seguito descritto:', marginLeft, (pos += 30))
        .font('Helvetica-Bold')
        .text(`${loc.dbx.families[budget.family]} CATERPILLAR, MODELLO`, marginLeft, (pos += 30), {align: 'center'})

    const startRect = (pos += 20);
    doc
        .text(dbx.models.find(m => m.id === budget.model).name, marginLeft, (pos += 10), {align: 'center'})
        .font('Helvetica')
        .text(dbx.versions.find(m => m.id === budget.version).description, 65, (pos += bodyLineHeight), {align: 'center', width: 480})

    doc
        .rect(55, startRect, 500, (pos = doc.y + 10) - startRect)
        .stroke('red');

    doc
        .image(path.resolve(`${__dirname}/..${dbx.models.find(m => m.id === budget.model).src}`), 150, (pos += 50), { width: 225 });

    doc
        .fontSize(8)
        .text('Foto puramente a scopo illustrativo', marginLeft, (pos - 10), {align: 'center', features: ['ital']})

    doc.addPage();

    pos = addHeader(user, doc);

    doc
        .rect(marginLeft, (pos += 40), (docWidth - (marginLeft * 2)), 24)
        .fillAndStroke('#dddddd');

    doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fill('black')
        .text('ACCESSORI E SERVIZI OPZIONALI INCLUSI NELLA FORNITURA', marginLeft, (pos += 8), { align: 'center' });

    pos += 20;
    budget.equipment.forEach(function (eId, index) {
        const eq = dbx.equipements.find(e => e.id === eId);
        doc
            .font('Helvetica')
            .text(`${index + 1}.`, marginLeft + 10, (pos += 15))
            .text(eq.name, marginLeft + 30, pos);
    });

    doc
        .rect(marginLeft, (pos += 40), (docWidth - (marginLeft * 2)), 24)
        .fillAndStroke('#dddddd');
    doc
        .font('Helvetica-Bold')
        .fill('black')
        .text('PERMUTA', marginLeft, (pos += 8), { align: 'center' });

    pos += 20;

    const exchange = {
        name: 'MACCHINA',
        builder: 'COSTRUTTORE',
        model: 'MODELLO',
        serial: 'MATRICOLA',
        year: 'ANNO',
        hours: 'ORE',
        notes: 'NOTE'
    };
    Object.keys(exchange).forEach(function (key) {
        if (budget.exchange[key])
            doc
                .font('Helvetica-Bold')
                .text(`${exchange[key]}:`, marginLeft, (pos += 13))
                .font('Helvetica')
                .text(budget.exchange[key], marginLeft + 100, pos);
    });

    if (budget.files.length) {
        doc
            .font('Helvetica-Bold')
            .text(`ALLEGATI:`, marginLeft, (pos += 13))
            .font('Helvetica')
            .text(budget.files.map(f => f.name).join(','), marginLeft + 100, pos);
    }

    pos += 60;
    doc
        .rect(marginLeft, pos, docWidth - (marginLeft * 2), 24)
        .stroke('black')
        .font('Helvetica-Bold')
        .text('PREZZO DI LISTINO', marginLeft + 20, (pos += 8))
        .text(toCurrency(calculateTotal(budget, dbx)), marginLeft + 250, pos, { align: 'right', width: 200 });

    pos+=20;
    doc
        .rect(marginLeft, pos, docWidth - (marginLeft * 2), 24)
        .stroke('black')
        .font('Helvetica-Bold')
        .text('PREZZO NETTO A VOI RISERVATO', marginLeft + 20, (pos += 8))
        .text(toCurrency(budget.summary.price || calculateTotal(budget, dbx)), marginLeft + 250, pos, { align: 'right', width: 200 });

    pos +=20;
    doc.fontSize(9);
    const summary = {
        payment: 'Pagamento',
        availability: 'Disponibilità',
        validity: 'Validità'
    };
    Object.keys(summary).forEach(function (key) {
        if (budget.summary[key])
            doc
                .font('Helvetica')
                .text(`${summary[key]}:`, marginLeft, (pos += 11))
                .text(budget.summary[key] + (key === 'validity' ? 'gg': ''), marginLeft + 100, pos);
    });

    doc.text('Restiamo a disposizione per ogni chiarimento e con l’occasione Vi inviamo i ns più Cordiali Saluti.', marginLeft, (pos +=20));

    doc.text(`${user.name} ${user.surname || ''}`, 200, (pos+=30), {align: 'center'});
    doc.text(`${user.email} - ${user.tel}`, 200, (pos+=13), {align: 'center'});
    doc.font('Helvetica-Bold').text((user.type == 3) ? (user.organization || '') : 'CGT Edilizia Spa', 200, (pos+=13), {align: 'center'});

    doc.end();
};
