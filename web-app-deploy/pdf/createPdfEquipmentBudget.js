const PdfDoc = require('pdfkit');
const path = require('path');
const fs = require('fs');
const { calculateEqTotal, calculateEqOfferedTotal, isOutsource, isBudgetOutdated } = require('../shared');
const { addHeader, getLongDate, toCurrency, getClientAddress } = require('./addHeader');
const sizeOf = require('image-size');


module.exports = function createPdfOrder(res, budget, dbx, user, dropbox) {
    const doc = new PdfDoc({
        info: {
            Title: `OFFERTA NUOVA ATTREZZATURA - ${budget.client.name || ''}`,
            Author: 'CGT EDILIZIA'
        }
    });
    const db = isBudgetOutdated('equipmentbudgets', budget, dbx) ? dropbox.getDbVersion(dbx, budget.created) : dbx;
    const retailer = db.retailers.find(r => r.id === user.organization) || {};

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
    let pos = addHeader(user, doc, db);

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
        .text('Oggetto: OFFERTA NUOVA ATTREZZATURA', marginLeft, (pos += 30))
        .font('Helvetica')
        .text('A seguito di Vs. gradita richiesta, Vi sottoponiamo nostra migliore offerta commerciale come di seguito descritto:', marginLeft, (pos += 30))
        .font('Helvetica-Bold');

    pos += 20;

    doc.font('Helvetica')
        .fontSize(6)
        .text('Foto puramente a scopo illustrativo', marginLeft, pos + 22)
        .fontSize(10);

    budget.equipment.forEach((eqId, index) => {
        const eq = db.equipements.find(e => e.id === eqId) || {};
        pos += index === 0 ? 30 : 60;
        if (doc.y > 630) {
            doc.addPage();
            pos = 40;
        }

        const imagePath = path.resolve(`${__dirname}/..${eq.src}`);
        if (fs.existsSync(imagePath)) {
            const dimensions = sizeOf(imagePath);
            const maxHeight = 50, maxWidth = 90;
            const ratio = maxWidth / maxHeight;
            if (ratio < (dimensions.width / dimensions.height)) {
                doc.image(imagePath, marginLeft, (pos), { width: maxWidth });
            } else {
                doc.image(imagePath, marginLeft, (pos), { height: maxHeight });
            }
        }

        doc
            .font('Helvetica-Bold')
            .text(`COSTRUTTORE: `, marginLeft + 100, pos)
            .text(`CODICE:`, marginLeft + 100, pos + 15)
            .text(`NOME:`, marginLeft + 100, pos + 30)
            .font('Helvetica')
            .text(`${eq.constructorId}`, marginLeft + 180, pos)
            .text(`${eq.code}`, marginLeft + 180, pos + 15)
            .text(`${eq.name}`, marginLeft + 180, pos + 30);
    });

    pos += 70;
    if (doc.y > 500) {
        doc.addPage();
        pos = 40;
    }

    doc.fontSize(9);
    const summary = {
        payment: 'Pagamento',
        availability: 'Disponibilità',
        validity: 'Validità'
    };

    Object.keys(summary)
        .filter(key => budget.summary[key])
        .forEach(function (key, index) {
            pos = index === 0 ? pos : doc.y + 4;
            doc
                .font('Helvetica')
                .text(`${summary[key]}:`, marginLeft, pos)
                .text(budget.summary[key] + (key === 'validity' ? 'gg' : ''), marginLeft + 100, pos);
        });

    if (budget.client.showPriceReal) {
        pos += 20;
        doc
            .rect(marginLeft, pos, docWidth - (marginLeft * 2), 24)
            .stroke('black')
            .font('Helvetica-Bold')
            .text('PREZZO DI LISTINO', marginLeft + 20, (pos += 8))
            .text(`${toCurrency(calculateEqTotal(budget, db))} + IVA`, marginLeft + 250, pos, { align: 'right', width: 200 });
    }

    pos += 20;
    doc
        .rect(marginLeft, pos, docWidth - (marginLeft * 2), 24)
        .stroke('black')
        .font('Helvetica-Bold')
        .text('PREZZO NETTO A VOI RISERVATO', marginLeft + 20, (pos += 8))
        .text(`${toCurrency(calculateEqOfferedTotal(budget, db))} + IVA`, marginLeft + 250, pos, { align: 'right', width: 200 });

    if (budget.summary.notes) {
        pos += 40;
        doc
            .fontSize(9)
            .font('Helvetica')
            .text(`Note:`, marginLeft, pos)
            .text(budget.summary.notes.replace(/\t/g, '   '), marginLeft + 100, pos);
        pos = doc.y;
    }

    pos += 20;
    doc.text('Restiamo a disposizione per ogni chiarimento e con l’occasione Vi inviamo i ns più Cordiali Saluti.', marginLeft, (pos += 20));

    doc.text(`${user.name} ${user.surname || ''}`, 200, (pos += 30), { align: 'center' });
    doc.text(`${user.email} - ${user.tel}`, 200, (pos += 13), { align: 'center' });

    if (user.type == 1) doc.font('Helvetica-Bold').text('CGT Spa', 200, (pos += 13), { align: 'center' });
    if (user.type == 2) doc.font('Helvetica-Bold').text('Compagnia Generale Trattori S.p.A.', 200, (pos += 13), { align: 'center' });
    if (isOutsource(user.type)) doc.font('Helvetica-Bold').text(retailer.name || '', 200, (pos += 13), { align: 'center' });

    doc.end();
};
