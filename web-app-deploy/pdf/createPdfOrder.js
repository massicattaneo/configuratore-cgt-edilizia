const PdfDoc = require('pdfkit');
const path = require('path');

module.exports = function createPdfOrder(res, code, cart) {
        const doc = new PdfDoc();
        doc.pipe(res);

        // doc
        //     .fontSize(20)
        //     .font('Helvetica-Bold')
        //     .fillColor('black')
        //     .text('IN', 40, 40)
        //     .fillColor('green')
        //     .text('&', 60, 40)
        //     .fillColor('black')
        //     .text('OUT', 74, 40);
        //
        // doc
        //     .fontSize(16)
        //     .font('Helvetica')
        //     .text('- Centro de belleza', 120, 43);
        //
        // doc
        //     .lineWidth(1)
        //     .lineCap('butt')
        //     .moveTo(40, 65)
        //     .lineTo(570, 65)
        //     .stroke();
        //
        // let y = 130;
        //
        // doc
        //     .fontSize(14)
        //     .fillColor('black')
        //     .text(`Hola! Ya puedes disfrutar de los tratamientos de In&Out!!!`, 40, y);
        //
        // y += 30;
        //
        // doc
        //     .fontSize(12)
        //     .fillColor('black')
        //     .text(`Vente a uno de nuestro centros con este codigo: (${code})`, 40, y);
        //
        // y += 10;
        //
        // doc
        //     .image(path.resolve(`web-app-deploy/order-qr-codes/${code}.png`), 25, y, { width: 130 });
        //
        // y += 160;
        //
        // doc
        //     .lineWidth(15)
        //     .lineCap('butt')
        //     .strokeColor('#dddddd')
        //     .moveTo(40, y + 5)
        //     .lineTo(570, y + 5)
        //     .stroke();
        // doc
        //     .text('Aqui lo que te espera en nuestro centro:', 40, y);
        //
        // y += 15;
        //
        //
        // y += 30;
        //
        // doc
        //     .image(path.resolve('web-app-deploy/static/assets/images/home-carousel/slider-1.png'), 40, 500, { width: 530 });


        doc.end();
    };
