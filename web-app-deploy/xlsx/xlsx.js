const XLSX = require('xlsx');
const fs = require('fs');
const shared = require('../shared');
const { toCurrency, toPercentage } = require('../pdf/addHeader');

module.exports = {
    createVehicleCgteXlsx: function (budget, dbx, order, user, xlsxPath) {
        const retailer = dbx.retailers.find(r => r.id === user.organization) || {};
        const orderNumber = shared.formatOrderNumber(order);
        const orderDetails = XLSX.utils.json_to_sheet([
            { CAMPO: 'Numero ordine', VALORE: orderNumber },
            { CAMPO: 'Cliente', VALORE: budget.client.name },
            { CAMPO: 'Modello macchina', VALORE: dbx.versions.find(v => v.id === budget.version).name },
            { CAMPO: 'Stato macchina', VALORE: 'Nuova' },
            { CAMPO: 'PERMUTA', VALORE: '' },
            { CAMPO: 'Data vendita', VALORE: order.exchange.date },
            { CAMPO: 'Documenti permuta', VALORE: order.exchange.documents },
            { CAMPO: 'Valore ritiro', VALORE: order.exchange.value },
            { CAMPO: 'Valore acquisto', VALORE: order.exchange.cost },
            { CAMPO: 'Super valutazione', VALORE: order.exchange.cost - order.exchange.value },
            { CAMPO: 'Data prevista consegna macchina', VALORE: order.deliveryDate },
            { CAMPO: 'Dichiarazione per sollevamento', VALORE: order.exchange.declaration },
            { CAMPO: 'Targatura', VALORE: order.exchange.plate },
            { CAMPO: 'Consegna meccanico officina esterna', VALORE: order.exchange.mechanic },
            { CAMPO: '', VALORE: '' },
            { CAMPO: 'Leasing', VALORE: order.leasing.on },
            { CAMPO: '', VALORE: '' },

            { CAMPO: 'Prezzo vendita (esclusa la permuta)', VALORE: order.price },
            { CAMPO: 'Prezzo al netto della permuta', VALORE: order.price - order.exchange.cost },
            {
                CAMPO: 'Venditore',
                VALORE: `${user.name} ${user.surname} ${retailer.name ? ` - ${retailer.name}` : ''}`
            },
            {
                CAMPO: 'Prezzo minimo vendita (TOTALE)',
                VALORE: shared.calculateTotal(budget, dbx, shared.getPriceType(user.userAuth))
            },
            { CAMPO: '', VALORE: '' },
            { CAMPO: 'Note', VALORE: order.notes }
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, orderDetails, 'Dettaglio Ordine');
        const data = budget.equipment.map(eId => {
            const eq = dbx.equipements.find(e => e.id === eId);
            return {
                'Codice Articolo': eq.code,
                'Descrizione Articolo': eq.name,
                'Fornitore': eq.builder,
                'SERIAL NUMBER': '',
                'Data invio ordine': '',
                'Disponibilita': '',
                'Completamento allestimento': ''
            };
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Attrezzature');

        const priceSummaryList = shared.createPriceSummaryList(dbx, user.userAuth, budget, budget.summary.price);
        const priceSummaryListJson = [
            ['DESCRIZIONE', 'LISTINO', 'MINIMO'],
            ['Macchina', toCurrency(priceSummaryList.vehicle.priceReal), toCurrency(priceSummaryList.vehicle.priceMin)]
        ]
            .concat(priceSummaryList.equipments.map(({ name, priceReal, priceMin }) => [name, toCurrency(priceReal), toCurrency(priceMin)]))
            .concat(priceSummaryList.charges.map(({ description, priceReal, priceMin }) => [description, toCurrency(priceReal), toCurrency(priceMin)]))
            .concat([['Totale', toCurrency(priceSummaryList.total.priceReal), toCurrency(priceSummaryList.total.priceMin)]])
            .concat(priceSummaryList.showVN === 'none' ? [[]] : [['VN%', '', toPercentage(priceSummaryList.vn)]])
            .concat(priceSummaryList.showExchange === 'none' ? [[]] : [['Valutazione della permuta', toCurrency(priceSummaryList.exchange.priceReal), toCurrency(priceSummaryList.exchange.priceMin)]])
            .concat(priceSummaryList.showExchange === 'none' ? [[]] : [['Nuovo totale', toCurrency(priceSummaryList.newTotal.priceReal), toCurrency(priceSummaryList.newTotal.priceMin)]])
            .concat([['PREZZO OFFERTO', '', toCurrency(priceSummaryList.offeredPrice)]]);

        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(priceSummaryListJson), 'Riepilogo Prezzi');
        /* generate buffer */
        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        fs.writeFileSync(xlsxPath, buf);
        const attachments = [{
            filename: 'Ordine.xlsx',
            path: xlsxPath
        }];
        return attachments;
    },
    createVehicleOutsourceXlsx: function (budget, dbx, order, user, xlsxPath) {
        const retailer = dbx.retailers.find(r => r.id === user.organization) || {};
        const orderNumber = shared.formatOrderNumber(order);
        const orderDetails = XLSX.utils.json_to_sheet([
            { CAMPO: 'Numero ordine', VALORE: orderNumber },
            { CAMPO: 'Cliente', VALORE: budget.client.name },
            { CAMPO: 'Modello macchina', VALORE: dbx.versions.find(v => v.id === budget.version).name },
            { CAMPO: 'Stato macchina', VALORE: 'Nuova' },
            { CAMPO: 'Campagna', VALORE: order.outsource.campaign },
            { CAMPO: 'Prezzo Acquisto', VALORE: order.price },
            { CAMPO: 'Trasporto', VALORE: order.outsource.transport },
            { CAMPO: 'Pagamento', VALORE: order.outsource.payment },
            { CAMPO: 'Data acquisto', VALORE: order.created.substr(0, 10) },
            { CAMPO: 'Data prevista consegna macchina', VALORE: order.deliveryDate },
            { CAMPO: 'Leasing', VALORE: order.leasing.on },
            {
                CAMPO: 'Venditore',
                VALORE: `${user.name} ${user.surname} ${retailer.name ? ` - ${retailer.name}` : ''}`
            },
            { CAMPO: 'Note', VALORE: order.notes }
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, orderDetails, 'Dettaglio Ordine');
        const data = budget.equipment.map(eId => {
            const eq = dbx.equipements.find(e => e.id === eId);
            return {
                'Codice Articolo': eq.code,
                'Descrizione Articolo': eq.name
            };
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Attrezzature');

        /* generate buffer */
        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        fs.writeFileSync(xlsxPath, buf);
        const attachments = [{
            filename: 'Ordine.xlsx',
            path: xlsxPath
        }];
        return attachments;
    },
    createEquipmentXlsx: function (budget, dbx, order, user, xlsxPath) {
        const retailer = dbx.retailers.find(r => r.id === user.organization) || {};
        const orderNumber = shared.formatOrderNumber(order);
        const outsource = shared.isOutsource(user.userAuth);

        const data1 = [
            { CAMPO: 'Numero ordine', VALORE: orderNumber },
            { CAMPO: 'Cliente', VALORE: budget.client.name },
            { CAMPO: 'Campagna', VALORE: order.outsource.campaign },
            { CAMPO: `Prezzo ${outsource ? 'acquisto' : 'vendita'}`, VALORE: order.price },
            {
                CAMPO: `Prezzo minimo ${outsource ? 'acquisto' : 'vendita'} (TOTALE)`,
                VALORE: shared.calculateEqTotal(budget, dbx, shared.getPriceType(user.userAuth))
            },
            { CAMPO: 'Trasporto', VALORE: order.outsource.transport },
            { CAMPO: 'Pagamento', VALORE: order.outsource.payment },
            { CAMPO: `Data ${outsource ? 'acquisto' : 'vendita'}`, VALORE: order.created.substr(0, 10) },
            { CAMPO: 'Data prevista consegna attrezzatura', VALORE: order.deliveryDate },
            { CAMPO: 'Leasing', VALORE: order.leasing.on },
            {
                CAMPO: 'Venditore',
                VALORE: `${user.name} ${user.surname} ${retailer.name ? ` - ${retailer.name}` : ''}`
            },
            { CAMPO: 'Note', VALORE: order.notes }
        ];
        if (!outsource) {
            data1.splice(2, 1);
            data1.splice(4, 2);
        }
        const orderDetails = XLSX.utils.json_to_sheet(data1);

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, orderDetails, 'Dettaglio Ordine');
        const data = budget.equipment.map(eId => {
            const eq = dbx.equipements.find(e => e.id === eId);
            return {
                'Codice Articolo': eq.code,
                'Descrizione Articolo': eq.name,
                'Fornitore': eq.builder,
                'SERIAL NUMBER': '',
                'Data invio ordine': '',
                'Disponibilita': '',
                'Completamento allestimento': ''
            };
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Attrezzature');

        /* generate buffer */
        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        fs.writeFileSync(xlsxPath, buf);
        const attachments = [{
            filename: 'Ordine.xlsx',
            path: xlsxPath
        }];
        return attachments;
    }

};
