import headTpl from './head.html';
import { createModal, flatten } from '../../utils';
import editTpl from './edit.html';
import { RetryRequest } from '../../../../modules/gml-http-request';
import { Node } from '../../../../modules/gml-html';

function getValue(item, key, keyAppendix, what) {
    return what === 'key' ? `${keyAppendix}${key}` || '' : item[key].toString();
}

function isObject(value) {
    return value instanceof Object && !(value instanceof Array);
}

function reduceObject(item, what = 'value', keyAppendix = '') {
    return Object.keys(item)
        .filter(key => key !== 'id' && key !== '_id' && key !== 'activationCode' && key !== 'userAuth' && key !== 'hash' && key !== 'userId' && key !== '')
        .map(key => isObject(item[key]) ? reduceObject(item[key], what, `${keyAppendix}${key}.`) : `${getValue(item, key, keyAppendix, what)}`);
}

function getColumnItem(item, col) {
    const keys = col.split('.');
    const value = keys.reduce((acc, key) => {
        return acc[key] || {};
    }, item);
    return value instanceof Object ? '' : value;
}

export default function ({ template, itemTemplate, filters }, data, tableName, Window, system) {
    const obj = {};
    let index = 0;
    let content;
    let head;
    let filterText = '';
    let table = data.slice(0);
    let sort = {
        field: '',
        direction: 1,
        type: 'text'
    };

    const sorters = {
        text: (a, b) => sort.direction * (a.localeCompare(b)),
        number: (a, b) => sort.direction * (a - b),
        date: (a, b) => sort.direction * (new Date(a).getTime() - new Date(b).getTime())
    };

    function filter() {
        const splitFilter = filterText.split(' ').map(i => i.trim());
        table = data
            .sort(function (a, b) {
                if (!sort.field) return 1;
                const a1 = sort.field.split('.').reduce((val, o) => val[o], a);
                const b1 = sort.field.split('.').reduce((val, o) => val[o], b);
                return sorters[sort.type](a1, b1);
            })
            .filter(i => {
                return filters.reduce(function (acc, field) {
                    const ands = field.split('&').map(i => i.trim());
                    if (i[field] && i[field].indexOf(filterText) !== -1) return true;
                    const matches = ands.filter(function (and) {
                        const red = and.split('.').reduce((val, o) => val[o], i).toUpperCase();
                        return splitFilter.filter(f => red.indexOf(f.toUpperCase()) !== -1).length > 0;
                    });
                    return !filterText || acc || (matches.length === splitFilter.length);
                }, false);
            });
        content.clear('items');
        Window.loadContent();
    }

    obj.sort = function (e) {
        const attribute = e.target.getAttribute('data-sort');
        if (attribute) {
            const [field, type] = attribute.split(':');
            if (field === sort.field) sort.direction *= -1;
            sort.field = field;
            sort.type = type;
            index = 0;
            filter();
        }
    };

    obj.start = function (search = '') {
        content = Window.content(template, [], {});
        head = Window.head(headTpl, [], {});
        Array.from(content.get().getElementsByTagName('th')).forEach(function (el) {
            el.addEventListener('click', obj.sort);
            el.style.cursor = 'pointer';
        });
        const form = Window.get();
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
                        close();
                        index = 0;
                        filter();
                    });
            }
        };
        form.save = function () {
            const columns = flatten(table
                .reduce((a, i) => a.concat(reduceObject(i, 'key')), []))
                .filter((o, i, a) => a.indexOf(o) === i)
                .sort((a, b) => a.localeCompare(b));

            const csvContent = table.map(function (item) {
                return columns.reduce((acc, col) => {
                    acc[col] = getColumnItem(item, col);
                    return acc;
                }, {});
            });

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), tableName);
            XLSX.writeFile(wb, `ESTRAZIONE_${new Date().formatDay('dd_mm_yy', [])}.xlsx`);
        };
        if (search) {
            filterText = search;
            filter();
            form.block(true);
        }
    };

    obj.destroy = function () {
        Array.from(content.get().getElementsByTagName('th')).forEach(function (el) {
            el.removeEventListener('click', obj.sort);
        });
    };

    obj.loadContent = async function () {
        const item = table[index];
        if (content && item) {
            content.appendTo('items', itemTemplate, [], Object.assign({}, item, {
                showEdit: item.equipmentFamily === 'FUORI LISTINO' ? 'inline-block' : 'none',
                name: filterText && item.name ?
                    item.name.replace(new RegExp(filterText, 'i'), `<strong style="color: green">${filterText}</strong>`) :
                    item.name
            }));
            index++;
        }
        await new Promise(r => setTimeout(r, 0));
    };

    return obj;
}
