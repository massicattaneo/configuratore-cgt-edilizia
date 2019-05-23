function flatten(array) {
    if (!(array instanceof Array)) return array;
    return array.reduce((acc, i) => acc.concat(flatten(i)), []);
}

function convertNumber(s) {
    const string = s.toString();
    if (string.indexOf(',') !== -1 && string.indexOf('.') !== -1) {
        if (string.indexOf(',') >= string.indexOf('.')) return Number(string.replace('.', '').replace(',', '.'));
        if (string.indexOf('.') >= string.indexOf(',')) return Number(string.replace(/[^0-9\.-]+/g, ''));
    } else if (string.indexOf(',') !== -1) {
        return Number(string.replace(',', '.'));
    }
    return Number(string);
}

function getPriceType(userAuth) {
    const ua = Number(userAuth);
    if (ua <= 1) return 'priceMin';
    if (ua === 2) return 'priceMin';
    if (ua === 3) return 'priceOutsource';
    if (ua === 4) return 'priceOutsource';
}

function calculateChargesPriceMin(salecharges, priceReal, priceMin, exchange) {
    const mapping = {
        transport: 'Trasporto',
        leasingCharge: 'Onere finanziamento leasing',
        directFinancingCharge: 'Onere finanziamento diretto',
        promotionalCampaign: 'Campagna promozionale',
        unconditionalDiscount: 'Abbuono incondizionato',
        cuttingOff: '1° tagliando'
    };
    const charges = flatten(Object.keys(salecharges)
        .map(key => {
            if (key === 'customCharges') {
                return salecharges[key].map(({ description, amount }) => {
                    return {
                        description,
                        priceReal: amount,
                        priceMin: amount
                    };
                });
            } else if (key === 'leasingCharge') {
                return {
                    description: mapping[key],
                    priceReal: Number(salecharges[key].replace(',', '.')) * priceReal / 100,
                    priceMin: Number(salecharges[key].replace(',', '.')) * priceMin / 100
                };
            } else if (key === 'promotionalCampaign') {
                return {
                    description: mapping[key],
                    priceReal: -salecharges[key],
                    priceMin: -salecharges[key]
                };
            } else {
                return {
                    description: mapping[key],
                    priceReal: salecharges[key],
                    priceMin: salecharges[key]
                };
            }
        }).concat([{
            description: 'Super valutazione della permuta',
            priceReal: exchange.cost - exchange.value,
            priceMin: exchange.cost - exchange.value
        }])).filter(i => i.priceReal);

    const totalChargesReal = charges.reduce((a, b) => a + Number(b.priceReal), 0);
    const totalChargesMin = charges.reduce((a, b) => a + Number(b.priceMin), 0);
    return { charges, totalChargesReal, totalChargesMin };
}

function calculateTotal(budget, db, priceType = 'priceReal') {
    const version = db.versions.find(v => v.id === budget.version);
    const eqs = budget.equipment.reduce((tot, id) => tot + db.equipements.find(e => e.id === id)[priceType], 0);
    return version ? version[priceType] + eqs : 0;
}

module.exports = {
    calculateTotal: calculateTotal,
    calculateEqTotal: function (budget, db, priceType = 'priceReal') {
        return budget.equipment
            .map(id => db.equipements.find(i => i.id === id))
            .reduce((tot, i) => tot + i[priceType], 0);
    },
    calculateEqOfferedTotal: function (budget, db, priceType = 'priceReal') {
        return budget.equipment
            .map(function (id) {
                const find = budget.offeredPrices.find(i => i.id === id);
                if (find) return Number(find.value);
                return db.equipements.find(i => i.id === id)[priceType];
            })
            .reduce((tot, v) => tot + v, 0);
    },
    getPriceType: getPriceType,
    canCreateOrder: function canCreateOrder(userAuth) {
        const ua = Number(userAuth);
        if (ua <= 1) return true;
        if (ua === 3) return true;
        return false;
    },
    isOutsource: function isOutsource(value) {
        return value.toString() === '3' || value.toString() === '4';
    },
    isOutsourceDirection: function isOutsource(value) {
        return value.toString() === '3';
    },
    formatOrderNumber: function (order) {
        return `${order.progressive.year}_${order.progressive.code}_${order.progressive.number}`;
    },
    emptyLeasing: function emptyLeasing() {
        return {
            emitter: '',
            loanPrice: '', //€
            rate: 0, //%
            prePayment: '', //%
            installments: '',
            finalPayment: '', //%
            contractualExpenses: '',
            insurance: '',
            factor: ''
        };
    },
    emptyVehicleSaleCharge: function emptyVehicleSaleCharge() {
        return {
            transport: '',
            leasingCharge: '',
            directFinancingCharge: '',
            promotionalCampaign: '',
            unconditionalDiscount: '',
            cuttingOff: '',
            customCharges: []
        };
    },
    createOrderXlsName: function (order, user) {
        return `Ordine_${order.created.substr(0, 16)}_${user.name}_${user.surname}.xlsx`;
    },
    convertNumber,
    calculateLeasing: function (leasing) {
        const installments = convertNumber(leasing.prePayment) > 0 ? convertNumber(leasing.installments) - 1 : convertNumber(leasing.installments);
        const prePayment = (convertNumber(leasing.loanPrice) / 100) * convertNumber(leasing.prePayment);
        const installmentPrice = (convertNumber(leasing.loanPrice) / 100) * convertNumber(leasing.factor);
        const finalPayment = (convertNumber(leasing.loanPrice) / 100) * convertNumber(leasing.finalPayment);
        const totalInstallmentPrice = installments * installmentPrice;
        const rate = convertNumber(leasing.rate);
        const loanPrice = convertNumber(leasing.loanPrice);
        return {
            rate,
            loanPrice,
            installments: installments,
            prePayment: prePayment,
            installmentPrice: installmentPrice,
            totalInstallmentPrice: totalInstallmentPrice,
            finalPayment: finalPayment,
            totalPrice: rate === 0 ? loanPrice : (prePayment + totalInstallmentPrice + finalPayment)
        };
    },
    createPriceSummaryList: function createPriceSummaryList(db, userAuth, store, offeredPrice) {
        const { salecharges = {}, exchange = {} } = store;
        const version = db.versions
            .find(v => v.id === store.version);
        const eq = store.equipment.map(id => db.equipements.find(e => e.id === id));
        const priceReal = calculateTotal(store, db, 'priceReal');
        const priceMin = calculateTotal(store, db, getPriceType(userAuth));
        const { charges, totalChargesReal, totalChargesMin } = calculateChargesPriceMin(salecharges, priceReal, priceMin, exchange);
        return {
            vehicle: {
                priceReal: version.priceReal,
                priceMin: version[getPriceType(userAuth)]
            },
            equipments: eq.map(e => Object.assign({
                name: e.name,
                priceReal: e.priceReal,
                priceMin: e[getPriceType(userAuth)]
            })),
            total: {
                priceReal: priceReal + totalChargesReal,
                priceMin: priceMin + totalChargesMin
            },
            showExchange: exchange.cost ? '' : 'none',
            exchange: {
                priceReal: exchange.value,
                priceMin: exchange.value
            },
            newTotal: {
                priceReal: priceReal + totalChargesReal - exchange.value,
                priceMin: priceMin + totalChargesMin - exchange.value
            },
            offeredPrice,
            vn: ((offeredPrice - (priceMin + totalChargesMin)) / (priceMin + totalChargesMin)) * 100,
            charges,
            showVN: Number(userAuth) <= 1 ? 'table-row' : 'none'
        };
    },
    calculateChargesPriceMin: calculateChargesPriceMin
};
