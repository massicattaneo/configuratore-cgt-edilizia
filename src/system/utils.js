import { HtmlView } from 'gml-html';
import { createPriceSummaryList } from '../../web-app-deploy/shared';

export function createModal(template, params, saveForm) {
    const modalView = HtmlView(template, {}, params);
    const modal = modalView.get();
    document.getElementById('modal').innerHTML = '';
    dialogPolyfill.registerDialog(modal);
    document.getElementById('modal').appendChild(modal);
    modal.showModal();
    modalView.get('form').save = async function (...args) {
        saveForm.call(this, close, ...args);
    };
    modalView.get('form').close = close;

    function enterKey(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            saveForm.call(modalView.get('form'), close);
        }
    }

    window.addEventListener('keydown', enterKey);

    function close() {
        modal.close();
        window.removeEventListener('keydown', enterKey);
    }

    setTimeout(componentHandler.upgradeDom, 0);

    return { modalView, modal };
}

export function flatten(array) {
    if (!(array instanceof Array)) return array;
    return array.reduce((acc, i) => acc.concat(flatten(i)), []);
}

export function showPriceSummaryList(system, store, salecharges, exchange, summary, offeredPrice, priceSummaryTpl) {
    window.event.stopPropagation();
    const db = system.db;
    const userAuth = system.store.userAuth;
    let params = createPriceSummaryList(db, userAuth, Object.assign({}, store, {salecharges, exchange, summary}), offeredPrice);
    const { modalView } = createModal(priceSummaryTpl, params);
    modalView.get('form').download = function () {
        const allData = [].slice
            .call(modalView.get('table').getElementsByTagName('tr'))
            .filter(i => i.style.display !== 'none')
            .map(tr => [].slice.call(tr.children).map(i => i.innerText));
        const columns = flatten(allData.splice(0, 1));
        const data = allData.map(item => {
            return columns.reduce((acc, key, index) => {
                acc[key] = item[index];
                return acc;
            }, {});
        });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'sommario');
        XLSX.writeFile(wb, `SOMMARIO_PREZZI.xlsx`);
    };
}
