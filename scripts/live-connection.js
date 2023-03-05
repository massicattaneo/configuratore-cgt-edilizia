const ObjectId = require('mongodb').ObjectID;
const shared = require("../web-app-deploy/shared")
const mongo = require('../web-app-deploy/mongo')(false);
const dropbox = require('../web-app-deploy/dropbox')(mongo);
const fs = require('fs');
const isOutsource = (value = "") => value.toString() === '3' || value.toString() === '4';
const { toPercentage } = require('../web-app-deploy/pdf/addHeader');

function sum(tot, num) {
    return tot + num
}

async function getOrderExcel(user, budget, order) {
    if (isOutsource(user.userAuth)) return undefined
    const dbx = await dropbox.getDb(user.userAuth, user, new Date(budget.created).getTime());
    const retailer = dbx.retailers?.find(r => r.id === user.organization) || {};
    const orderNumber = shared.formatOrderNumber(order);
    const version = dbx.versions?.find(v => v.id === budget.version) || {};
    const outsource = order.outsource || {};
    if (isOutsource(user.userAuth)) {
        return [
            { CAMPO: 'Data Ordine', VALORE: `${new Date(order.created).getFullYear()}-${(new Date(order.created).getMonth() + 1).toString().padStart(2, "0")}-${(new Date(order.created).getDate()).toString().padStart(2, "0")}` },
            { CAMPO: 'Data Preventivo', VALORE: `${new Date(budget.created).getFullYear()}-${(new Date(budget.created).getMonth() + 1).toString().padStart(2, "0")}-${(new Date(budget.created).getDate()).toString().padStart(2, "0")}` },
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
        const priceSummaryList = shared.createPriceSummaryList(dbx, user.userAuth, budget, budget.summary.price);
        
        return [
            { CAMPO: 'Data Ordine', VALORE: `${new Date(order.created).getFullYear()}-${(new Date(order.created).getMonth() + 1).toString().padStart(2, "0")}-${(new Date(order.created).getDate()).toString().padStart(2, "0")}` },
            { CAMPO: 'Data Preventivo', VALORE: `${new Date(budget.created).getFullYear()}-${(new Date(budget.created).getMonth() + 1).toString().padStart(2, "0")}-${(new Date(budget.created).getDate()).toString().padStart(2, "0")}` },
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
            { CAMPO: "Totale Oneri Listino", VALORE: Number(priceSummaryList.totalCharges.totalChargesReal).toFixed(2) },
            { CAMPO: "Totale Oneri Minimo", VALORE: Number(priceSummaryList.totalCharges.totalChargesMin).toFixed(2) },
            { CAMPO: "VN%", VALORE: priceSummaryList.showVN === 'none' ? "" : toPercentage(priceSummaryList.vn) },
            { CAMPO: "Totale Listino", VALORE: priceSummaryList.total.priceReal },
            { CAMPO: "Totale Minimo", VALORE: priceSummaryList.total.priceMin },
            { CAMPO: 'Note', VALORE: order.notes }
        ]
    }
        
}

(async function () {
    const { db } = await mongo.connect();
    const orders = (await (await db.collection('vehicleorders').find()).toArray()).reverse()
    await dropbox.init()
    console.log("START")
    const pepe = []
    await orders.reduce(async (prev, order) => {
        await prev
        const budget = (await (await db.collection("vehiclebudgets").find({ _id: ObjectId(order.budgetId) })).toArray())[0]
        const user = (await (await db.collection("users").find({ _id: ObjectId(order.userId) })).toArray())[0]
        return getOrderExcel(user, budget, order).then(done => {
            console.log(done)
            pepe.push(done)
        })
    })
    
    const filtered = pepe.filter(item => item)
    const data = []
    data.push(filtered[0].map(item => item.CAMPO).join(','))
    data.push(...filtered.map(array => array.map(item => (item.VALORE ?? "").toString().replace(/,/g, " ").replace(/\n/g, " ")).join(',')))
    
    fs.writeFileSync('./estrazione1.csv', data.join('\n'), 'utf-8')
    console.log("finish")
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