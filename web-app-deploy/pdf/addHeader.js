const path = require('path');
const loc = require('../static/localization/system/it.json');
const globalize = require('../static/localization/globalize/it.json');

module.exports = {
    addHeader: function (user, doc) {
        const headerFontSize = 9;
        const headerLineHeight = 10;
        const headerMarginLeft = 190;
        const marginLeft = 30;

        let pos = 0;
        if (user.type == 3) {
            pos = 60;
            return pos;
        }
        pos = 40;
        doc
            .image(path.resolve(__dirname, '../static/assets/images/cgt.png'), marginLeft, 20, { width: 150 });

        doc
            .image(path.resolve(__dirname, '../static/assets/images/qualityCertification.png'), 500, 20, { width: 80 });
        doc
            .font('Helvetica-Bold')
            .fontSize(headerFontSize)
            .text(loc.company.name, headerMarginLeft, 22);
        doc
            .font('Helvetica')
            .fillColor('grey')
            .fontSize(headerFontSize)
            .text(loc.company.address, headerMarginLeft, pos)
            .text(`Tel. ${loc.company.tel} - Fax. ${loc.company.fax}`, headerMarginLeft, (pos += headerLineHeight))
            .text(`C.F. e P. Iva ${loc.company.pIVA} – Cap. Soc. ${loc.company.capSoc}`, headerMarginLeft, (pos += headerLineHeight))
            .text(loc.company.info, headerMarginLeft, (pos += headerLineHeight))
            .text(loc.company.reg, headerMarginLeft, (pos += headerLineHeight));

        return pos;
    },
    getLongDate: function getLongDate(date) {
        return `${globalize[`day_${date.getDay()}`]}, ${date.getDate()} ${globalize[`month_${date.getMonth()}`]} ${date.getFullYear()}`;
    },
    toCurrency: function toCurrency(number, currency = 'Euro') {
        const string = parseFloat(number).toFixed(2);
        const integer = string.split('.')[0].split('').reverse().reduce((array, item, index) => {
            const number = Math.floor(index / 3);
            array[number] = array[number] || [];
            array[number].push(item);
            return array;
        }, []).map(a => a.reverse()).reverse().join('.').replace(/,/g, '');
        const decimals = string.split('.')[1];
        return `${currency} ${integer},${decimals}`;
    }
};