const ObjectId = require('mongodb').ObjectID;
const shared = require("../web-app-deploy/shared")
const mongo = require('../web-app-deploy/mongo')(false);
const dropbox = require('../web-app-deploy/dropbox')(mongo);
const isOutsource = (value = "") => value.toString() === '3' || value.toString() === '4';

function getOrderExcel(user, budget, order, dbx) {
    const retailer = dbx.retailers.find(r => r.id === user.organization) || {};
    const orderNumber = shared.formatOrderNumber(order);
    const version = dbx.versions.find(v => v.id === budget.version) || {};
    if (isOutsource(user.userAuth)) {
        return [
            { CAMPO: 'Numero ordine', VALORE: orderNumber },
            { CAMPO: 'Cliente', VALORE: budget.client ? budget.client.name : "" },
            { CAMPO: 'Modello macchina', VALORE: version.name },
            { CAMPO: 'Stato macchina', VALORE: 'Nuova' },
            { CAMPO: 'Campagna', VALORE: outsource.campaign },
            { CAMPO: 'Prezzo Acquisto', VALORE: order.price },
            { CAMPO: 'Trasporto', VALORE: outsource.transport },
            { CAMPO: 'Pagamento', VALORE: outsource.payment },
            { CAMPO: 'Data acquisto', VALORE: order.created.substr(0, 10) },
            { CAMPO: 'Data prevista consegna macchina', VALORE: order.deliveryDate },
            { CAMPO: 'Leasing', VALORE: order.leasing.on },
            {
                CAMPO: 'Venditore',
                VALORE: `${user.name} ${user.surname} ${retailer.name ? ` - ${retailer.name}` : ''}`
            },
            { CAMPO: 'Note', VALORE: order.notes }
        ]
    } else {
        return [
            { CAMPO: 'Numero ordine', VALORE: orderNumber },
            { CAMPO: 'Cliente', VALORE: budget.client ? budget.client.name : "" },
            { CAMPO: 'Modello macchina', VALORE: version.name },
            { CAMPO: 'Stato macchina', VALORE: 'Nuova' },
            { CAMPO: 'PERMUTA', VALORE: '' },
            { CAMPO: 'Data vendita', VALORE: order.exchange.date },
            { CAMPO: 'Documenti permuta', VALORE: order.exchange.documents },
            { CAMPO: 'Valore ritiro', VALORE: (order.exchange.value) || '' },
            { CAMPO: 'Valore acquisto', VALORE: (order.exchange.cost) || '' },
            { CAMPO: 'Super valutazione', VALORE: (order.exchange.cost - order.exchange.value) || '' },
            { CAMPO: 'Data prevista consegna macchina', VALORE: order.deliveryDate },
            { CAMPO: 'Dichiarazione per sollevamento', VALORE: order.exchange.declaration },
            { CAMPO: 'Targatura', VALORE: order.exchange.plate },
            { CAMPO: 'Consegna meccanico officina esterna', VALORE: order.exchange.mechanic },
            { CAMPO: 'Leasing', VALORE: order.leasing.on },
            { CAMPO: 'Prezzo vendita (esclusa la permuta)', VALORE: order.price },
            { CAMPO: 'Prezzo al netto della permuta', VALORE: (order.price - order.exchange.cost) || '' },
            {
                CAMPO: 'Venditore',
                VALORE: `${user.name} ${user.surname} ${retailer.name ? ` - ${retailer.name}` : ''}`
            },
            {
                CAMPO: 'Prezzo minimo vendita (TOTALE)',
                VALORE: shared.calculateTotal(budget, dbx, shared.getPriceType(user.userAuth))
            },
            
            { CAMPO: 'Note', VALORE: order.notes }
        ]
    }
        
}

(async function () {
    const { store, db } = await mongo.connect();
    const dbx = await dropbox.getDb();

    const promises = []
    const orders = await (await db.collection('vehicleorders').find()).toArray()
    
    const pepe = await Promise.all(orders.map(async order => {
        const budget = await db.collection("vehiclebudgets").find({ _id: ObjectId(order.budgetId) })
        const user = await db.collection("users").find({_id: ObjectId(order.userId) })
        return getOrderExcel(user, budget, order, dbx)
    }))

    console.log(pepe[0])
    // (await db.collection('vehicleorders').find()).forEach(async order => {
    //     const budget = db.collection("vehiclebudgets").find({ _id: ObjectId(order.budgetId) })
    //     const user = db.collection("users").find({_id: ObjectId(order.userId) })
    //     promises.push(getOrderExcel(user, budget, order, dbx))
    //     return 
    // })

    // await new Promise(resolve => {
    //     setTimeout(() => {
    //         console.log(promises[0])
    //         resolve()
    //     },3000)
    // })
})()