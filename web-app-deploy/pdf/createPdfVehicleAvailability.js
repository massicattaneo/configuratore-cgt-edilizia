const PdfDoc = require('pdfkit');
const path = require('path');
const { toCurrency } = require('./addHeader');
const docWidth = 572;
const docHeight = 740;
const primaryBackColor = '#AE0E0E';
const secondartyBackColor = '#FFCD11';
const blueColors = ['#daebf8', '#aab7c0'];
const marginLeft = 20;
const labels = {
    priceMin: 'mv',
    priceOutsource: 'conc',
    priceOriginalOutsource: 'mv',
    priceCGT: 'cgt'
};
//305.5E2CR, 308E2CR
const globalize = require('../static/localization/globalize/it.json');

function groupByModels(array, models) {
    return array.reduce(function (grouped, item) {
        const model1 = item.model;
        const model = models.find(m => model1.indexOf(m.name) !== -1) || {};
        grouped[model1] = grouped[model1] || {
            items: [],
            model: {
                name: model1,
                src: model.src
            }
        };
        grouped[model1].items.push(item);
        return grouped;
    }, {});
}

function groupByMonths(items) {
    return [new Date()]
        .concat([1, 2, 3, 4, 5].map(function (sum) {
            const date = new Date();
            date.setDate(1);
            date.setHours(12, 0, 0, 0);
            date.setMonth(date.getMonth() + sum);
            const dateString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padLeft(2, '0')}-01T00:00:00`;
            console.log(dateString);
            return new Date((new Date(dateString)).getTime() - 1000);
        }))
        .concat(new Date('2200-01-01'))
        .map(date => date.getTime())
        .map(function (timestamp, index, array) {
            return items.filter((item) => {
                const time = new Date(item.expectedEntryDate).getTime();
                return time < timestamp && (index === 0 || time >= array[index - 1]);
            }).length;
        });
}

function addTitle(doc, y) {
    const today = new Date();
    doc.rect(marginLeft, y, docWidth, 20).fill(primaryBackColor);
    doc.image(path.resolve(`${__dirname}/../static/assets/images/cgt.png`), marginLeft + 5, y + 2, { width: 60 });
    y += 6;
    doc.fontSize(9);
    doc.fill('#FFFFFF').text('MOD', 100, y);
    doc.fill('#FFFFFF').text('STOCK', 250, y);
    for (let i = 0; i < 5; i++) {
        doc.fill('#FFFFFF').text(globalize[`month_${(today.getMonth() + i) % 12}`].substr(0, 3).toUpperCase(), 290 + (i * 40), y);
    }
    doc.fill('#FFFFFF').text('IN ARRIVO', 490, y);
    doc.fill('#FFFFFF').text('TOT', 550, y);
    return y + 6;
}

module.exports = function (res, { vehicleAvailability, models }) {
    const today = new Date();
    const month = globalize[`month_${today.getMonth()}`].toUpperCase();
    const title = `DISPONIBILITA MACCHINE' ${today.getDate()} ${month} ${today.getFullYear()}`;
    const doc = new PdfDoc({
        bufferPages: true,
        margins: {
            top: 20,
            left: marginLeft,
            bottom: 40,
            right: marginLeft
        },
        info: {
            Title: title,
            Author: 'CGT EDILIZIA'
        }
    });
    doc.pipe(res);

    // TITLE
    doc.fontSize(10).font('Helvetica-Bold')
        .text(title, { align: 'center' });

    const groups = groupByModels(vehicleAvailability, models);
    const sortedList = Object.keys(groups).map(g => groups[g]).sort((a, b) => a.model.name.localeCompare(b.model.name));

    let y = addTitle(doc, doc.y);

    const colors = ['#FFFFFF', '#CCCCCC'];
    let previousImage;
    let previousStart;
    let previousCount = 0;
    sortedList.forEach(function (group, index) {
        y += 11;

        if (doc.y > docHeight) {
            doc.addPage();
            y = addTitle(doc, doc.y) + 11;
        }

        if (group.model.src) {
            if (group.model.src !== previousImage && previousStart !== group.model.name[0]) {
                if (previousImage) {
                    y += Math.max(0, 50 - (previousCount * 11)) + 5;
                    doc.fill('#000000').moveTo(marginLeft, y - 5).lineWidth(4).strokeColor(secondartyBackColor).lineTo(590, y - 5).stroke();
                }
                previousCount = 0;
                previousStart = group.model.name[0];
                previousImage = group.model.src;
                doc
                    .image(path.resolve(`${__dirname}/..${group.model.src}`), marginLeft, y, { width: 70 });
            }
        }

        previousCount++;
        const counters = groupByMonths(group.items);
        doc.rect(100, y - 2, 440, 11).fill(colors[index % 2]);
        doc.rect(540, y - 2, 50, 11).fill(blueColors[index % 2]);
        doc.fill('#000000').text(group.model.name, 100, y);
        counters.forEach(function (count, i) {
            doc.fill('#000000').text(count, 250 + (i * 40), y);
        });
        doc.fill('#000000').text(group.items.length, 550, y);
    });

    y = doc.y + 20;
    doc.rect(100, y - 2, 490, 11).fill(blueColors[0]);
    doc.fill('#000000').text('TOTALE', 100, y);
    const counters = sortedList.map(group => groupByMonths(group.items)).reduce((tot, arr) => tot.map((s, i) => s + arr[i]), [0, 0, 0, 0, 0, 0, 0]);
    counters.forEach(function (count, i) {
        doc.fill('#000000').text(count, 250 + (i * 40), y);
    });
    doc.fill('#000000').text(counters.reduce((s, i) => s + i, 0), 550, y);


    doc.flushPages();
    doc.end();
};
