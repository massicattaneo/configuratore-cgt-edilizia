import headTpl from './head.html';
import { createModal } from '../../utils';
import editTpl from './edit.html';
import { RetryRequest } from '../../../../modules/gml-http-request';

export default function (template, itemTemplate, data, tableName, window, system) {
    const obj = {};
    let index = 0;
    let content;
    let head;
    let filterText = '';
    let table = data.slice(0);

    function filter() {
        table = data
            .filter(i => {
                const checkName = i.name.toUpperCase().indexOf(filterText.toUpperCase()) !== -1;
                const checkCategory = i.equipmentFamily.toUpperCase().indexOf(filterText.toUpperCase()) !== -1;
                return checkName || checkCategory;
            });
        content.clear('items');
        window.loadContent();
    }

    obj.start = function () {
        content = window.content(template, [], {});
        head = window.head(headTpl, [], {});
        const form = window.get();
        form.block = function (bool) {
            content.get().className = bool ? 'alternate-table blocks' : 'alternate-table';
        };
        form.search = function (value) {
            index = 0;
            filterText = value;
            filter();
        };
        form.add = function (showDelete, id) {
            if (tableName === 'equipements') {
                const eq = system.db.equipements.find(i => i.id === id);
                const { modalView, modal } = createModal(editTpl, Object.assign({ showDelete }, eq),
                    async function (close, isDeleted = false) {
                        if (!this.code.value) system.throw('custom', { message: 'MANCA IL CODICE' });
                        if (!this.name.value) system.throw('custom', { message: 'MANCA LA DESCRIZIONE' });
                        if (!this.constructorId.value) system.throw('custom', { message: 'MANCA IL COSTRUTTORE' });
                        if (!this.time.value) system.throw('custom', { message: 'MANCA IL TEMPO DI CONSEGNA' });
                        if (!this.priceReal.value) system.throw('custom', { message: 'MANCA IL PREZZO' });
                        const priceReal = Number(this.priceReal.value.replace(',', ''));
                        const res = await RetryRequest(id ? `/api/rest/equipments/${id}` : `/api/rest/equipments`,
                            { headers: { 'Content-Type': 'application/json' } })
                            .send(id ? 'put' : 'post', JSON.stringify({
                                code: this.code.value,
                                name: this.name.value,
                                info: '',
                                notes: '',
                                image: '',
                                depliants: '',
                                priceReal: priceReal,
                                priceMin: priceReal,
                                priceOutsource: priceReal,
                                priceCGT: priceReal,
                                familys: [],
                                equipmentFamily: 'FUORI LISTINO',
                                constructorId: this.constructorId.value,
                                time: this.time.value,
                                compatibility: [],
                                isDeleted
                            }));
                        const item = JSON.parse(res.responseText);
                        Object.assign(item, { id: item._id });
                        if (id)
                            system.db.equipements.splice(system.db.equipements.indexOf(eq), 1);
                        if (!isDeleted)
                            system.db.equipements.push(item);
                        system.updateDb();
                        filter();
                        close();
                    });
            }
        };
    };

    obj.loadContent = async function () {
        const item = table[index];
        if (content && item) {
            content.appendTo('items', itemTemplate, [], Object.assign({}, item, {
                showEdit: item.equipmentFamily === 'FUORI LISTINO' ? 'inline-block' : 'none',
                name: filterText ?
                    item.name.replace(new RegExp(filterText, 'i'), `<strong style="color: green">${filterText}</strong>`) :
                    item.name
            }));
            index++;
        }
        await new Promise(r => setTimeout(r, 0));
    };

    return obj;
}