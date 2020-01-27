import { HtmlView } from 'gml-html';
import template from './template.html';
import itemTemplate from './item.html';
import * as style from './style.scss';

function getGenders(item) {
    if (!item.genders.length) return '';
    if (item.genders.length === 1) return `<fieldset name="genders-${item.id}">GENERE: ${item.genders[0]}</fieldset>`;
    return `
        <div class="mdl-textfield mdl-js-textfield mdl-textfield--floating-label">
            <label class="mdl-textfield__label" for="exchange_documents">GENERE</label>
            <select class="mdl-textfield__input" id="" name="genders-${item.id}" onchange="this.form.change()">
            ${item.genders.map(i => `<option value="${i}">${i}</option>`).join('')}
            </select>
        </div>
        `;
}

export default async function ({ locale, system, thread }) {
    const view = HtmlView(template, style, locale.get());
    view.style();
    const store = rx.create({ search: '' });

    view.get('wrapper').search = function (input) {
        store.search = input.value;
    };

    rx.connect
        .partial(store)
        .debounce(500)
        .subscribe(({ search }) => {
            view.clear('items');
            system.db.shopItems
                .filter(item => {
                    if (!search) return true;
                    if (item.name.toLowerCase().indexOf(search.toLowerCase()) !== -1) return true;
                    if (item.type.toLowerCase().indexOf(search.toLowerCase()) !== -1) return true;
                    return false;
                })
                .forEach(item => {
                    const variables = Object.assign({}, item, {
                        formName: `shop-item-${item.id}`,
                        images: item.images.length ? item.images : ['/../assets/images/no-image.jpg'],
                        genders: getGenders(item),
                        sizes: Object
                            .keys(item.sizes)
                            .map(key => `
                <div class="mdl-textfield mdl-js-textfield mdl-textfield--floating-label" id="wrapper-sizes-${item.id}-${key}">
                    <label class="mdl-textfield__label" for="exchange_documents">TAGLIA</label>
                    <select class="mdl-textfield__input" id="" name="sizes-${item.id}-${key}">
                    ${item.sizes[key].map(i => `<option value="${i}">${i}</option>`).join('')}
                    </select>
                </div>
                `).join('')
                    });
                    const form = view.appendTo('items', itemTemplate, [], variables).get('form');
                    form.change = genderChange;
                    form.addToCart = function () {
                        const genderFormEl = form[`genders-${item.id}`] || {};
                        const gender = genderFormEl.value || '';
                        const sizeFormEl = form[`sizes-${item.id}-${gender}`] || {};
                        const size = sizeFormEl.value || '';
                        const cartItem = { id: item.id, gender, size, quantity: 1 };
                        const exist = system.store.cart.find(i => i.id === item.id && i.size === size && i.gender === gender);
                        if (exist) {
                            exist.quantity++;
                            system.store.cart.push();
                        } else {
                            system.store.cart.push(cartItem);
                        }
                        system.setStorage({ cart: system.store.cart });
                    };

                    function genderChange() {
                        const gender = form[`genders-${item.id}`].value;
                        Object.keys(item.sizes).forEach(g => {
                            form.querySelector(`#wrapper-sizes-${item.id}-${g}`).style.display = g === gender ? 'block' : 'none';
                        });
                    }

                    item.genders.length && genderChange();
                });
            componentHandler.upgradeDom();

        });

    view.destroy = function () {

    };

    return view;
}
