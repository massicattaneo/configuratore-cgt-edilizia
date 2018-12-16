function convertNumber(s) {
    const string = s.toString();
    if (string.indexOf(',')!== -1 && string.indexOf('.') !== -1) {
        if (string.indexOf(',') >= string.indexOf('.')) return Number(string.replace('.', '').replace(',', '.'));
        if (string.indexOf('.') >= string.indexOf(',')) return Number(string.replace(/[^0-9\.-]+/g,""));
    } else if (string.indexOf(',')!== -1) {
        return Number(string.replace(',', '.'));
    }
    return Number(string);
}
module.exports = {
    calculateTotal: function (budget, db, priceType = 'priceReal') {
        const version = db.versions.find(v => v.id === budget.version);
        const eqs = budget.equipment.reduce((tot, id) => tot + db.equipements.find(e => e.id === id)[priceType], 0);
        return version ? version[priceType] + eqs : 0;
    },
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
    getPriceType: function (userAuth) {
        const ua = Number(userAuth);
        if (ua <= 1) return 'priceMin';
        if (ua === 2) return 'priceMin';
        if (ua === 3) return 'priceOutsource';
        if (ua === 4) return 'priceOutsource';
    },
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
    createOrderXlsName: function (order, user) {
        return `Ordine_${order.created.substr(0, 16)}_${user.name}_${user.surname}.xlsx`;
    },
    convertNumber,
    calculateLeasing: function (leasing) {
        const installments = convertNumber(leasing.prePayment) > 0 ? convertNumber(leasing.installments)-1 : convertNumber(leasing.installments);
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
        }
    }
};
