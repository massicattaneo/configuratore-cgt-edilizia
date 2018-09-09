const XLSX = require('xlsx');
const fs = require('fs');
const shared = require('../shared');

module.exports = {
    createVehicleXlsx: function (budget, dbx, order, user, xlsxPath) {
        const retailer = dbx.retailers.find(r => r.id === user.organization) || {};
        const orderNumber = shared.formatOrderNumber(order);
        const orderDetails = XLSX.utils.json_to_sheet([
            { CAMPO: 'Number ordine', VALORE: orderNumber },
            { CAMPO: 'Cliente', VALORE: budget.client.name },
            { CAMPO: 'Modello macchina', VALORE: dbx.versions.find(v => v.id === budget.version).name },
            { CAMPO: 'Stato macchina', VALORE: 'Nuova' },
            { CAMPO: 'Data vendita', VALORE: order.created.substr(0, 10) },
            { CAMPO: 'Data prevista consegna macchina', VALORE: order.deliveryDate },
            { CAMPO: 'Prezzo vendita', VALORE: order.price },
            { CAMPO: 'Prezzo minimo vendita (TOTALE)', VALORE: shared.calculateTotal(budget, dbx, shared.getPriceType(user.userAuth)) },
            { CAMPO: 'Note', VALORE: order.notes },
            { CAMPO: 'PERMUTA', VALORE: ''},
            { CAMPO: 'Valore permuta', VALORE: budget.exchange.value },
            { CAMPO: 'Supervalutazione permuta', VALORE: order.exchange.overvalue },
            { CAMPO: 'Data vendita permuta', VALORE: order.exchange.date },
            { CAMPO: 'Disponibilità macchina', VALORE: order.exchange.availability },
            {
                CAMPO: 'Venditore',
                VALORE: `${user.name} ${user.surname} ${retailer.name ? ` - ${retailer.name}` : ''}`
            },
            { CAMPO: 'Note permuta', VALORE: order.exchange.notes },
            { CAMPO: 'Documenti permuta', VALORE: order.exchange.documents },
            { CAMPO: 'Consegna meccanico officina esterna', VALORE: order.exchange.mechanic },
            { CAMPO: 'Data prevista consegna macchina in permuta', VALORE: order.exchange.delivery },
            { CAMPO: 'Dichiarazione per sollevamento', VALORE: order.exchange.declaration },
            { CAMPO: 'Targatura', VALORE: order.exchange.plate },
            { CAMPO: 'LEASING', VALORE: ''},
            { CAMPO: 'Leasing - documenti consegnati a società leasing', VALORE: order.leasing.documents },
            { CAMPO: 'Leasing approvato', VALORE: order.leasing.approved },
            { CAMPO: 'Leasing - pagamento anticipo', VALORE: order.leasing.payment }
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
                'Completamento allestimento': '',
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
        const orderDetails = XLSX.utils.json_to_sheet([
            { CAMPO: 'Number ordine', VALORE: orderNumber },
            { CAMPO: 'Cliente', VALORE: budget.client.name },
            { CAMPO: 'Data vendita', VALORE: order.created.substr(0, 10) },
            { CAMPO: 'Data prevista consegna attrezzature', VALORE: order.deliveryDate },
            { CAMPO: 'Prezzo vendita', VALORE: order.price },
            { CAMPO: 'Prezzo minimo vendita (TOTALE)', VALORE: shared.calculateTotal(budget, dbx, shared.getPriceType(user.userAuth)) },
            { CAMPO: 'Note', VALORE: order.notes },
            {
                CAMPO: 'Venditore',
                VALORE: `${user.name} ${user.surname} ${retailer.name ? ` - ${retailer.name}` : ''}`
            },
            { CAMPO: 'LEASING', VALORE: ''},
            { CAMPO: 'Leasing - documenti consegnati a società leasing', VALORE: order.leasing.documents },
            { CAMPO: 'Leasing approvato', VALORE: order.leasing.approved },
            { CAMPO: 'Leasing - pagamento anticipo', VALORE: order.leasing.payment }
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
                'Completamento allestimento': '',
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