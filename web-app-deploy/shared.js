module.exports = {
    calculateTotal: function (budget, db, priceType = 'priceReal') {
        const version = db.versions.find(v => v.id === budget.version);
        const eqs = budget.equipment.reduce((tot, id) => tot + db.equipements.find(e => e.id === id)[priceType], 0);
        return version ? version[priceType] + eqs : 0;
    },
    calculateEqTotal: function (budget, db) {
        return budget.equipment
            .map(id => db.equipements.find(i => i.id === id))
            .reduce((tot, i) => tot + i.priceReal, 0)
    },
    calculateEqOfferedTotal: function (budget, db) {
        return budget.equipment
            .map(function (id) {
                const find = budget.offeredPrices.find(i => i.id === id);
                if (find) return Number(find.value);
                return db.equipements.find(i => i.id === id).priceReal
            })
            .reduce((tot, v) => tot + v, 0)
    }
};