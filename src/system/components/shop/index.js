import { HtmlView } from 'gml-html';
import template from './template.html';
import itemTemplate from './item.html';
import * as style from './style.scss';

function getGenders(item) {
    if (!item.genders.length) return '';
    if (item.genders.length === 1) return `GENERE: <input style="border:none;font-size: 16px;color: #202020;" disabled name="genders-${item.id}" value="${item.genders[0]}" /><br/>`;
    return `
        <div class="mdl-textfield mdl-js-textfield mdl-textfield--floating-label">
            <label class="mdl-textfield__label" for="exchange_documents">GENERE</label>
            <select class="mdl-textfield__input" id="" name="genders-${item.id}" onchange="this.form.change()">
            ${item.genders.map(i => `<option value="${i}">${i}</option>`).join('')}
            </select>
        </div>
        `;
}

function addItemToShop(item, locale, view, system) {
    const variables = Object.assign({}, item, {
        system: locale.get('system'),
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
}

export default async function ({ locale, system, thread }) {
    const categories = system.db.shopItems
        .map(item => `${item.product}${item.subCategory ? ` | ${item.subCategory}` : ''}`)
        .filter((item, index, array) => array.indexOf(item) === index)
        .sort((first, second) => first.localeCompare(second));

    const view = HtmlView(template, style, Object.assign({ categories }, locale.get()));
    window.rx.connect({
        width: () => system.deviceInfo().width
    }, ({ width }) => {
        view.style(width > 565 ? '' : 'two-lines');
    });

    const store = rx.create({
        search: '',
        filter: ''
    });
    let scrollListener = null;
    view.get('wrapper').search = function (form) {
        store.search = form['shop-search'].value;
        store.filter = form['shop-filter'].value;
    };

    rx.connect
        .partial(store)
        .debounce(500)
        .subscribe(({ search, filter }) => {
            view.clear('items');
            const shopItems = system.db.shopItems
                .filter(item => {
                    if (!filter) return true;
                    const [product, subCategory] = filter.split(' | ');
                    if (!subCategory && item.product === product) return true;
                    if (item.subCategory === subCategory && item.product === product) return true;
                    return false;
                })
                .filter(item => {
                    if (!search) return true;
                    if (item.name.toLowerCase().indexOf(search.toLowerCase()) !== -1) return true;
                    return item.type.toLowerCase().indexOf(search.toLowerCase()) !== -1;
                }).slice(0);
            const mainEl = document.getElementById('main');
            mainEl.removeEventListener('scroll', scrollListener);
            let item = shopItems.shift();
            scrollListener = () => {
                while (shouldLoadContent() && item) {
                    addItemToShop(item, locale, view, system);
                    item = shopItems.shift();
                }
            };
            mainEl.addEventListener('scroll', scrollListener);
            scrollListener();
            componentHandler.upgradeDom();

        });

    view.destroy = function () {

    };

    view.navigate = () => {
        scrollListener && scrollListener();
    };

    const shouldLoadContent = () => {
        const { height } = window.getComputedStyle(document.body);
        const windowHeight = Number(height.replace('px', ''));
        const items = document.getElementById('main');
        const remaining = items.scrollHeight - items.scrollTop - windowHeight;
        const customGap = 350;
        return (remaining + customGap < windowHeight);
    };

    return view;
}

