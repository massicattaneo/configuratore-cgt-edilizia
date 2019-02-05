import { HtmlView } from "gml-html";
import { calculateTotal, getPriceType } from '../../web-app-deploy/shared';

export function createModal(template, params, saveForm) {
    const modalView = HtmlView(template, {}, params);
    const modal = modalView.get();
    document.getElementById('modal').innerHTML = '';
    dialogPolyfill.registerDialog(modal);
    document.getElementById('modal').appendChild(modal);
    modal.showModal();
    modalView.get('form').save = async function(...args) {
        saveForm.call(this, close, ...args);
    };
    modalView.get('form').close = close;

    function enterKey(event) {
        if (event.key === "Enter") {
            event.preventDefault();
            saveForm.call(modalView.get('form'), close)
        }
    }

    window.addEventListener("keydown", enterKey);

    function close() {
        modal.close();
        window.removeEventListener("keydown", enterKey)
    }

    setTimeout(componentHandler.upgradeDom, 0);

    return { modalView, modal };
}

export function flatten(array) {
    if (!(array instanceof Array)) return array;
    return array.reduce((acc, i) => acc.concat(flatten(i)), []);
}

export function calculateChargesPriceMin(salecharges, priceReal, priceMin, exchange) {
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

export function showPriceSummaryList(system, store, salecharges, exchange, summary, offeredPrice, priceSummaryTpl) {
    window.event.stopPropagation();
    const version = system.db.versions
        .find(v => v.id === store.version);
    const eq = store.equipment.map(id => system.db.equipements.find(e => e.id === id));
    const priceReal = calculateTotal(store, system.db, 'priceReal');
    const priceMin = calculateTotal(store, system.db, getPriceType(system.store.userAuth));
    const { charges, totalChargesReal, totalChargesMin } = calculateChargesPriceMin(salecharges, priceReal, priceMin, exchange);

    const { modalView } = createModal(priceSummaryTpl, {
        vehicle: {
            priceReal: version.priceReal,
            priceMin: version[getPriceType(system.store.userAuth)]
        },
        equipments: eq.map(e => Object.assign({
            name: e.name,
            priceReal: e.priceReal,
            priceMin: e[getPriceType(system.store.userAuth)]
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
        charges
    });
    modalView.get('form').download = function () {
        const allData = [].slice
            .call(modalView.get('table').getElementsByTagName('tr'))
            .filter(i => i.style.display !== 'none')
            .map(tr => [].slice.call(tr.children).map(i => i.innerText));
        const columns = flatten(allData.splice(0,1));
        const data = allData.map(item => {
            return columns.reduce((acc, key, index) => {
                acc[key] = item[index];
                return acc;
            }, {})
        });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'sommario');
        XLSX.writeFile(wb, `SOMMARIO_PREZZI.xlsx`);
    };
}
