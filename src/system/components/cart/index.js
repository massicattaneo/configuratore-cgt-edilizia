import { HtmlView } from 'gml-html';
import template from './template.html';
import itemTemplate from './item.html';
import * as style from './style.scss';
import { RetryRequest } from '../../../../modules/gml-http-request';

export default async function ({ locale, system, thread }) {
    const view = HtmlView(template, style, locale.get());
    view.style();

    const form = view.get('wrapper');
    form.add = function (id, gender = '', size = '') {
        system.store.cart.find(i => i.id === id && i.gender === gender && i.size === size).quantity++;
        system.store.cart.push();
        system.setStorage({ cart: system.store.cart });
    };
    form.subtract = function (id, gender = '', size = '') {
        const find = system.store.cart.find(i => i.id === id && i.gender === gender && i.size === size);
        if (find.quantity === 1) {
            system.store.cart.splice(system.store.cart.indexOf(find), 1);
        } else {
            find.quantity--;
            system.store.cart.push();
        }
        system.setStorage({ cart: system.store.cart });
    };
    form.save = async function (button) {
        if (confirm('SEI SICURO DI VOLER INVIARE L\'ORDINE?')) {
            button.setAttribute('disabled', 'disabled');
            const body = system.store.cart;
            await RetryRequest(`/api/shop/order`, { headers: { 'Content-Type': 'application/json' } })
                .post(JSON.stringify(body));
            system.store.cart.splice(0, system.store.cart.length);
            system.setStorage({ cart: system.store.cart });
            alert('ORDINE INVIATO! A breve riceverai una email di conferma');
        }
    };

    rx.connect({ cart: system.store.cart }, function ({ cart }) {
        view.clear('items');
        if (!cart.length) {
            view.appendTo('items', '<tr><td colspan="3" style="text-align: center;">NESSUN PRODOTTO SELEZIONATO</td></tr>');
        }
        cart.forEach(item => {
            const storeItem = system.db.shopItems.find(i => i.id === item.id);
            view.appendTo('items', itemTemplate, [], {
                id: item.id,
                src: storeItem.images.length ? storeItem.images[0] : '/../assets/images/no-image.jpg',
                quantity: item.quantity,
                gender: item.gender,
                size: item.size,
                title: `<strong>${storeItem.type}</strong> <span>${item.gender ? `(${item.gender})` : ''}</span>${item.size ? `<br/><span>Taglia: ${item.size}</span>` : ''}<br/><span>${storeItem.name}</span><br/><i style="font-size: 9px">${storeItem.description}</i>`
            });
        });

        view.get('shoplink').style.display = !cart.length ? 'block' : 'none';
        view.get('sendorder').style.display = cart.length ? 'block' : 'none';
    });

    view.destroy = function () {

    };


    return view;
}
