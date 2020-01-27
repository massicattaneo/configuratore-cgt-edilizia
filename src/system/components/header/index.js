import { HtmlView } from 'gml-html';
import template from './template.html';
import * as style from './style.scss';

export default async function ({ system, locale }) {
    const view = HtmlView(template, style, locale.get());
    view.style();

    view.get('carticon').style.display = ['0', '5'].indexOf(system.store.userAuth.toString()) !== -1 ? 'block' : 'none';

    rx.connect
        .partial({
            loading: () => system.store.loading
        })
        .subscribe(function ({ loading }) {
            view.get('progress').style.opacity = loading ? 1 : 0;
        });

    rx.connect
        .partial({
            cart: () => system.store.cart
        })
        .subscribe(function ({ cart }) {
            const cartnotify = view.get('cartnotify');
            cartnotify.className = '';
            setTimeout(() => {
                cartnotify.style.display = cart.length ? 'block' : 'none';
                const total = cart.reduce((sum, item) => sum + item.quantity, 0);
                if (total > 0) {
                    cartnotify.className = 'scale-up';
                    cartnotify.innerHTML = total;
                }
            })
        });

    view.setTitle = function (title) {
        view.get('title').innerHTML = title;
    };

    return view;
}
