const XLSX = require('xlsx');
const fs = require('fs');
const shared = require('../shared');

module.exports = {
    createVehicleXlsx: function (budget, dbx, order, user, xlsxPath) {
        const orderDetails = XLSX.utils.json_to_sheet([
            { CAMPO: 'Cliente', VALORE: budget.client.name },
            { CAMPO: 'Modello macchina', VALORE: dbx.versions.find(v => v.id === budget.version).name },
            { CAMPO: 'Stato macchina', VALORE: 'Nuova' },
            { CAMPO: 'Prezzo vendita', VALORE: order.price },
            { CAMPO: 'Prezzo minimo vendita (TOTALE)', VALORE: shared.calculateTotal(budget, dbx) },
            { CAMPO: 'Valore permuta', VALORE: budget.exchange.value },
            { CAMPO: 'Supervalutazione permuta', VALORE: order.exchange.overvalue },
            { CAMPO: 'Data vendita', VALORE: order.exchange.date },
            { CAMPO: 'Disponibilità macchina', VALORE: order.exchange.availability },
            {
                CAMPO: 'Venditore',
                VALORE: `${user.name} ${user.surname} ${user.organization ? ` - ${user.organization}` : ''}`
            },
            { CAMPO: 'Documenti permuta', VALORE: order.exchange.documents },
            { CAMPO: 'Data prevista consegna macchina', VALORE: order.exchange.delivery },
            { CAMPO: 'Dichiarazione per sollevamento', VALORE: order.exchange.declaration },
            { CAMPO: 'Targatura', VALORE: order.exchange.plate },
            { CAMPO: 'Leasing - documenti consegnati a società leasing', VALORE: order.leasing.documents },
            { CAMPO: 'Leasing approvato', VALORE: order.leasing.approved },
            { CAMPO: 'Leasing - pagamento anticipo', VALORE: order.leasing.payment },
            { CAMPO: 'Consegna meccanico officina esterna', VALORE: order.exchange.mechanic },
            { CAMPO: 'Note', VALORE: order.exchange.notes }
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
        const orderDetails = XLSX.utils.json_to_sheet([
            { CAMPO: 'Cliente', VALORE: budget.client.name },
            { CAMPO: 'Prezzo vendita', VALORE: shared.calculateEqOfferedTotal(budget, dbx) },
            { CAMPO: 'Prezzo minimo vendita (TOTALE)', VALORE: shared.calculateEqTotal(budget, dbx) },
            {
                CAMPO: 'Venditore',
                VALORE: `${user.name} ${user.surname} ${user.organization ? ` - ${user.organization}` : ''}`
            },
            { CAMPO: 'Leasing - documenti consegnati a società leasing', VALORE: order.leasing.documents },
            { CAMPO: 'Leasing approvato', VALORE: order.leasing.approved },
            { CAMPO: 'Leasing - pagamento anticipo', VALORE: order.leasing.payment },
            { CAMPO: 'Consegna meccanico officina esterna', VALORE: order.exchange.mechanic }
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