const PdfDoc = require('pdfkit');
const path = require('path');
const { toCurrency } = require('./addHeader');
const docWidth = 612;
const docHeight = 740;
const primaryBackColor = '#AE0E0E';
const marginLeft = 30;
const labels = {
    priceMin: 'mv',
    priceOutsource: 'conc',
    priceCGT: 'cgt'
};
//305.5E2CR, 308E2CR

module.exports = function createPdfOrder(res, models, dbx, includeMin, includeType = 'priceMin') {

    function printTableLine(doc, version, y) {
        let maxY = y;
        doc.fontSize(9);
        doc.text(`${version.name}`, marginLeft, y, { width: 140 });
        maxY = Math.max(doc.y, maxY);
        if (includeMin) {
            doc.text(`${toCurrency(version.priceReal, '€')}`, marginLeft + 145, y, { width: 60, continued: true });
            doc.fontSize(7).text(`\n${labels[includeType]}: ${toCurrency(version[includeType], '€')}`, marginLeft + 145, y, { width: 60 });
            doc.fontSize(9);
        } else {
            doc.text(toCurrency(version.priceReal, '€'), marginLeft + 145, y, { width: 60 });
        }
        maxY = Math.max(doc.y, maxY);
        doc.text(version.description, marginLeft + 210, y, { width: 150 });
        maxY = Math.max(doc.y, maxY);
        doc.text(version.available, marginLeft + 365, y, { width: 60 });
        maxY = Math.max(doc.y, maxY);
        doc.text(version.time, marginLeft + 430, y, { width: 60 });
        maxY = Math.max(doc.y, maxY);
        doc.text(version.timeEurostock, marginLeft + 495, y, { width: 60 });
        maxY = Math.max(doc.y, maxY);
        return maxY;
    }

    function printHead(doc, y, columns) {
        doc.font('Helvetica').fontSize(9);
        doc.rect(marginLeft / 2, y, docWidth - marginLeft, 20).fill(primaryBackColor);
        doc.fill('#ffffff');

        let posX = marginLeft;
        columns.forEach(col => {
            doc.text(col.title, posX, y + 6);
            posX += col.width + 5;
        });

        doc.fill('#000000');
        return posX;
    }

    function printList(doc, columns, list, y, offset = 5) {
        let maxY = y;
        let posX = printHead(doc, y, columns);
        y = doc.y + offset;

        function printItem(version, index) {
            columns.forEach(col => {
                const format = col.format || (e => e);
                if (col.field === 'priceReal' && includeMin) {
                    doc.text(format(version[col.field], index, version), posX, y + 6, { width: col.width, height: 100, continued:true });
                    doc.fontSize(7).text(`\n${labels[includeType]}: ${toCurrency(version[includeType], '€')}`, posX);
                    doc.fontSize(9);
                } else {
                    doc.text(format(version[col.field], index, version), posX, y + 6, { width: col.width, height: 100 });
                }
                maxY = Math.max(doc.y, maxY);
                posX += col.width + 5;
            });
        }

        list.forEach((version, index) => {
            posX = marginLeft;
            printItem(version, index);
            const shouldChangePage = maxY > docHeight;
            if (shouldChangePage) {
                doc.rect(marginLeft / 2, y - offset, docWidth - marginLeft, maxY - y + offset).fill('#ffffff');
                doc.addPage();
                y = doc.y;
                maxY = y;
                printHead(doc, y, columns);
                y = doc.y + offset;
                posX = marginLeft;
                printItem(version, index);
            }
            const color = index % 2 === 0 ? '#dddddd' : '#ffffff';
            doc.rect(marginLeft / 2, y - offset, docWidth - marginLeft, maxY - y + offset).fill(color);
            doc.fill('#000000');
            y -= 4;
            posX = marginLeft;
            printItem(version, index);
            y = maxY + offset;
        });
        return maxY;
    }

    const doc = new PdfDoc({
        bufferPages: true,
        margins: {
            top: 40,
            left: marginLeft,
            bottom: 40,
            right: marginLeft
        }
    });
    doc.pipe(res);

    const date = new Date();
    let pos = 40;

    doc
        .fontSize(28)
        .font('Helvetica-Bold')
        .text('LISTINO PREZZI CGT Edilizia', { align: 'center' });

    doc.y = 100;
    doc
        .fontSize(10)
        .font('Helvetica')
        .text(`Listino ${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()} – Annulla e sostituisce il precedente.`,
            { align: 'center' });

    doc.y = 200;
    doc
        .image(path.resolve(__dirname, '../static/assets/images/price-list-pdf-front.png'),
            (docWidth - 500) / 2, doc.y, { width: 500 });

    doc.y = 450;
    doc
        .fontSize(13)
        .font('Helvetica')
        .text(`IL PRESENTE LISTINO ANNULLA E SOSTITUISCE IL PRECEDENTE E POTRA’ ESSERE VARIATO IN QUALSIASI MOMENTO. \n\nI PREZZI DELLE ATTREZZATURE SI INTENDONO VALIDI SE VENDUTE INSIEME ALLA MACCHINA COME PRIMO EQUIPAGGIAMENTO.\n\nPER ULTERIORI CHIARIMENTI CONTATTARE L’UFFICIO PRODOTTO.\n\nINFORMAZIONI PER ESCLUSIVO USO INTERNO AZIENDALE.\n\n VIETATA LA RIPRODUZIONE, DIFFUSIONE E CESSIONE A TERZI.
        `,
            { align: 'center' });

    doc.y = 750;

    doc
        .rect(0, doc.y, docWidth, 45)
        .fillAndStroke(primaryBackColor);

    doc.y += 8;
    doc
        .image(path.resolve(__dirname, '../static/assets/images/cgt.png'), (docWidth - 100) / 2, doc.y, { width: 100 });

    doc.addPage();
    doc.font('Helvetica').fontSize(9);
    doc.rect(marginLeft / 2, doc.y - 20, docWidth - marginLeft, doc.y).fill(primaryBackColor);
    doc.fill('#ffffff');
    let y = doc.y;
    doc.text('VERSIONE', marginLeft, y-16);
    doc.text('LISTINO', marginLeft + 145, y-16);
    doc.text('CONFIGURAZIONE BASE (O)', marginLeft + 210, y-16);
    doc.text('DISPONIBILITÀ', marginLeft + 365, y-16);
    doc.text('FABBRICA', marginLeft + 430, y-16);
    doc.text('EUROSTOCK', marginLeft + 495, y-16);

    doc.y += 10;

    dbx.versions
        .filter(v => models.find(m => m === v.modelId))
        .forEach(function (version, index) {
            y = doc.y;
            let maxY = doc.y;
            maxY = printTableLine(doc, version, y);
            const color = index % 2 === 0 ? '#dddddd' : '#ffffff';
            doc.rect(marginLeft / 2, y - 5, docWidth - marginLeft, maxY - y + 5).fill(color);
            doc.fill('#000000');
            printTableLine(doc, version, y);

            if (doc.y > 600) {
                doc.addPage()
            } else {
                doc.y = maxY + 10;
            }
        });

    models.forEach(function (modelId, mIndex) {
        doc.addPage();
        const model = dbx.models.find(i => i.id === modelId);
        const family = dbx.familys.find(f => f.id === model.familyId);

        doc.fontSize(16).font('Helvetica-Bold')
            .text(`${family.name} ${model.name} – ${family.id}`, { align: 'center' });

        doc
            .image(path.resolve(`${__dirname}/..${model.src}`), (docWidth - 300) / 2, 60, { width: 300 });

        const versions = dbx.versions.filter(v => v.modelId === modelId);

        let y = doc.y = 280;
        const columns = [
            { title: '', width: 15, field: 'name', format: (e, i) => `${i + 1}.` },
            { title: 'VERSIONE', width: 150, field: 'name' },
            { title: 'LISTINO', width: 70, field: 'priceReal', format: (value) => toCurrency(value, '€') },
            { title: 'DIPONIBILITÁ', width: 100, field: 'available' },
            { title: 'DA FABBRICA', width: 100, field: 'time' },
            { title: 'DA EUROSTOCK', width: 100, field: 'timeEurostock' }
        ];
        y = printList(doc, columns, versions, y) + 10;
        const info = versions
            .reduce((a, v) => a.concat(v.info), [])
            .filter((o, i, a) => a.indexOf(o) === i)
            .sort()
            .map(info => {
                const vrs = versions.reduce((a, v, i) => {
                    a[i] = v.info.find(i => i === info) ? 'X' : '-';
                    return a;
                }, {});
                return Object.assign({ info }, vrs);
            });
        const ls = [{
            field: 'info',
            title: 'Caratteristiche',
            width: docWidth - 50 - (marginLeft * 2) - (20 * versions.length)
        }];
        ls.push(...versions.map((v, i) => {
            return { field: i, title: `${i + 1}`, width: 20 };
        }));
        printList(doc, ls, info, y, 1);
        doc.addPage();
        y = doc.y;
        const eList = dbx.equipements
            .sort((a, b) => a.equipmentFamily.localeCompare(b.equipmentFamily))
            .filter(e => e.compatibility.find(c => c.id === modelId));

        const groups = eList.map(e => e.equipmentFamily).filter((o, i, a) => a.indexOf(o) === i).sort();

        groups.forEach(function (group) {
            if (y > (docHeight - 100)) {
                doc.addPage();
                y = doc.y;
            }
            doc.rect(marginLeft / 2, y, docWidth - marginLeft, doc.y - y + 15)
                .fill('#FFCD11');
            doc.fill('#000000').text(group, 0, y + 5, { align: 'center' });
            y += 15;
            y = printList(doc, [
                { field: 'code', title: 'Codice', width: 110 },
                {
                    field: 'name', title: 'Attrezzatura', width: 380, format: (str, index, item) => {
                        return `${str} ${item.notes ? `\nNOTE: ${item.notes}` : ''} ${item.info ? `\nINFORMAZIONI: ${item.info}` : ''}`;
                    }
                },
                { field: 'priceReal', title: 'Listino', width: 80, format: v => toCurrency(v, '€') },
            ], eList.filter(e => e.equipmentFamily === group), y);
            y += 20;
            doc.y = y;
        });
    });

    doc.flushPages();
    doc.end();
};
