const PdfDoc = require('pdfkit');
const path = require('path');
const fs = require('fs');
const sizeOf = require('image-size');
const loc = require('../static/localization/system/it.json');
const { calculateTotal, isOutsource } = require('../shared');
const { addHeader, getLongDate, toCurrency, getClientAddress } = require('./addHeader');

module.exports = function createPdfOrder(res, budget, dbx, user) {
    const doc = new PdfDoc({
        info: {
            Title: `OFFERTA MACCHINA NUOVA - ${budget.client.name || ''}`,
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
        .text('Oggetto: OFFERTA MACCHINA NUOVA', marginLeft, (pos += 30))
        .font('Helvetica')
        .text('A seguito di Vs. gradita richiesta, Vi sottoponiamo nostra migliore offerta commerciale come di seguito descritto:', marginLeft, (pos += 30))
        .font('Helvetica-Bold')
        .text(`${loc.dbx.families[budget.family]} CATERPILLAR, MODELLO`, marginLeft, (pos += 30), { align: 'center' });

    const startRect = (pos += 20);
    const budgetVersion = dbx.versions.find(m => m.id === budget.version) || { name: '', description: '' };
    doc
        .text(budgetVersion.name, marginLeft, (pos += 10), { align: 'center' })
        .font('Helvetica')
        .text(budgetVersion.description, 65, (pos += bodyLineHeight), {
            align: 'center',
            width: 480
        });

    doc
        .rect(55, startRect, 500, (pos = doc.y + 10) - startRect)
        .stroke('red');

    const imagePath = `${__dirname}/..${dbx.versions.find(v => v.id === budget.version).src}`;
    if (fs.existsSync(imagePath))
        doc
            .image(path.resolve(imagePath),
                (docWidth - 400) / 2, (pos += 10), { width: 300 });

    doc
        .fontSize(8)
        .text('Foto puramente a scopo illustrativo', marginLeft, (pos + 250), { align: 'center', features: ['ital'] });

    doc.addPage();

    pos = addHeader(user, doc, dbx);

    doc
        .rect(marginLeft, (pos += 40), (docWidth - (marginLeft * 2)), 24)
        .fillAndStroke('#dddddd');

    doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fill('black')
        .text('ACCESSORI E SERVIZI OPZIONALI INCLUSI NELLA FORNITURA', marginLeft, (pos += 8), { align: 'center' });

    pos += 20;

    if (budget.equipment.length)
        doc.font('Helvetica')
            .fontSize(6)
            .text('Foto puramente a scopo illustrativo', marginLeft, pos)
            .fontSize(10);
    else
        doc
            .font('Helvetica')
            .fontSize(15)
            .fillColor('gray')
            .text('NESSUNO', marginLeft, pos + 15, { align: 'center' })
            .fillColor('black')
            .fontSize(10);


    budget.equipment.forEach((eqId, index) => {
        const eq = dbx.equipements.find(e => e.id === eqId) || {};
        pos += index === 0 ? 10 : 60;
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
            .text(`${toCurrency(calculateTotal(budget, dbx))} + IVA`, marginLeft + 250, pos, {
                align: 'right',
                width: 200
            });
    }

    pos += 20;
    doc
        .rect(marginLeft, pos, docWidth - (marginLeft * 2), 24)
        .stroke('black')
        .font('Helvetica-Bold')
        .text('PREZZO NETTO A VOI RISERVATO', marginLeft + 20, (pos += 8))
        .text(`${toCurrency(budget.summary.price || calculateTotal(budget, dbx))} + IVA`, marginLeft + 250, pos, {
            align: 'right',
            width: 200
        });

    if (budget.summary.notes) {
        pos += 40;
        doc
            .fontSize(9)
            .font('Helvetica')
            .text(`Note:`, marginLeft, pos)
            .text(budget.summary.notes.replace(/\t/g, '   '), marginLeft + 100, pos);
        pos = doc.y;
    }

    if (budget.exchange.name) {
        pos += 20;
        if (doc.y > 500) {
            doc.addPage();
            pos = 40;
        }

        doc
            .rect(marginLeft, pos, (docWidth - (marginLeft * 2)), 24)
            .fillAndStroke('#dddddd');
        doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .fill('black')
            .text('MACCHINA DI VOSTRA PROPRIETA’', marginLeft, (pos += 8), { align: 'center' });

        doc.fontSize(9);

        pos += 20;

        const exchange = {
            name: 'Macchina',
            builder: 'Costruttore',
            model: 'Modella',
            serial: 'Matricola',
            year: 'Anno',
            cost: 'Valore di acquisto permuta',
            notes: 'NOTE'
        };

        Object.keys(exchange).forEach(function (key) {
            if (budget.exchange[key])
                doc
                    .font('Helvetica-Bold')
                    .text(`${exchange[key]}:`, marginLeft, (pos += 13))
                    .font('Helvetica')
                    .text(key === 'cost' ? toCurrency(budget.exchange[key]) : budget.exchange[key], marginLeft + 150, pos);
        });

        if (budget.files.length) {
            doc
                .font('Helvetica-Bold')
                .text(`ALLEGATI:`, marginLeft, (pos += 13))
                .font('Helvetica')
                .text(budget.files.map(f => f.name).join(','), marginLeft + 150, pos);
        }

        pos += 20;
        doc.text('A fronte dell’acquisto della macchina sopra riportata, la societa\' e\' disposta a ritirare in permuta ' +
            'la Vostra macchina nelle condizioni da Noi vista priva di vizi occulti e libera da privilegi.', marginLeft, pos);
        pos = doc.y;
    }

    pos += 20;
    doc.text('Restiamo a disposizione per ogni chiarimento e con l’occasione Vi inviamo i ns più Cordiali Saluti.', marginLeft, (pos += 20));

    doc.text(`${user.name} ${user.surname || ''}`, 200, (pos += 30), { align: 'center' });
    doc.text(`${user.email} - ${user.tel}`, 200, (pos += 13), { align: 'center' });
    if (user.type == 1) doc.font('Helvetica-Bold').text('CGT Edilizia Spa', 200, (pos += 13), { align: 'center' });
    if (user.type == 2) doc.font('Helvetica-Bold').text('Compagnia Generale Trattori S.p.A.', 200, (pos += 13), { align: 'center' });
    if (isOutsource(user.type)) doc.font('Helvetica-Bold').text(retailer.name || '', 200, (pos += 13), { align: 'center' });

    doc.end();
};
