import { Node, HtmlStyle, HtmlView } from 'gml-html';
import * as styles from './window.scss';
import template from './window.html';

export default async function ({ thread, system, context, parent, title, locale, App }) {
    const obj = {};
    const app = App(obj, system);
    const view = HtmlView(template, styles, locale.get());
    const barHeight = 80;
    const model = window.rx.create(Object.assign({}, context.window));
    let isDestroyed = false;

    parent.appendChild(view.get());

    const scrollable = view.get('scrollable');
    const onScroll = HTMLElement.prototype
        .addEventListener
        .bind(scrollable)
        .partial('scroll')
        .filter(shouldLoadContent)
        .debouncePromise()
        .subscribe(loadContent);

    const disconnect =
        window.rx.connect({
            deviceType: () => system.deviceInfo().deviceType,
            height: () => system.deviceInfo().height,
            cart: () => system.store.cart,
            windowHeight: () => model.height
        }, function t({ deviceType, height, cart, windowHeight }) {
            const wrapperHeight = windowHeight - 15;
            const isDesktop = deviceType === 'desktop';
            const contHeight = (isDesktop ? Number(wrapperHeight) : height) - 150;
            view.style(deviceType, {
                bar: { height: barHeight },
                container: { height: contHeight },
                wrapper: isDesktop ? { top: model.y, left: model.x, width: model.width, height: model.height } : {}
            });
            view.get('title').innerHTML = title;
        });

    obj.startApp = function () {
        system.deviceInfo().deviceType === 'desktop' ? startDesktopApp() : startMobileApp();
        view.get('close').addEventListener('click', obj.destroy);
        app.start();
    };

    obj.destroy = function () {
        isDestroyed = true;
        view.get('close').removeEventListener('click', obj.destroy);
        return new Promise(function (resolve) {
            obj.get().addEventListener('transitionend', function () {
                parent.removeChild(obj.get());
                disconnect();
                view.get('scrollable').removeEventListener('scroll', onScroll);
                view.get('bar').removeEventListener('mousedown', mousedown);
                view.get('').removeEventListener('mouseup', mouseup);
                view.get('bar').removeEventListener('dblclick', doubleclick);
                app.destroy && app.destroy();
                context.focuses.splice(context.focuses.indexOf(obj), 1);
                system.navigateTo('/it/esplora');
                resolve();
            });
            obj.get().style.transform = `translate(${system.deviceInfo().width}px, 0)`;
        });
    };

    obj.navigateTo = function (subpage) {
        app.navigateTo && app.navigateTo(subpage);
    };

    obj.loadContent = () => loadContent();

    function doubleclick() {
        model.x = system.deviceInfo().width > 1024 ? 250 : 5;
        model.y = 75;
        model.width = system.deviceInfo().width - (system.deviceInfo().width >1024 ? 270 : 30);
        model.height = system.deviceInfo().height - 95;
    }

    function shouldLoadContent() {
        const windowHeight = window.innerHeight - barHeight;
        const remaining = scrollable.scrollHeight - scrollable.scrollTop - windowHeight;
        const customGap = 240;
        return (remaining + customGap < windowHeight) && app.loadContent;
    }

    async function loadContent() {
        await app.loadContent();
        if (shouldLoadContent()) {
            await loadContent();
        }
    }

    async function startMobileApp() {
        view.get().style.transform = `translate(${system.deviceInfo().width}px, 0)`;
        await new Promise(res => setTimeout(res, 0));
        shouldLoadContent() && loadContent();
        view.get().style.transform = `translate(0, 0)`;
    }

    async function startDesktopApp(name) {
        view.get('').addEventListener('mouseup', resize);
        view.get('bar').addEventListener('mousedown', mousedown);
        view.get('bar').addEventListener('dblclick', doubleclick);
        view.get().style.left = context.window.x + 'px';
        view.get().style.top = context.window.y + 'px';
        shouldLoadContent() && loadContent();
    }

    function changeFocus() {
        context.focuses.forEach((f, index) => {
            f.get().style.zIndex = 1;
            if (f === obj) context.focusIndex = index;
        });
        obj.get().style.zIndex = 2;
    }

    function convert(string) {
        return Number(string.replace('px', ''));
    }

    function resize(e) {
        setTimeout(function () {
            if (!isDestroyed) {
                const style = view.get().style;
                model.width = convert(style.width);
                model.height = convert(style.height);
                context.window.width = convert(style.width);
                context.window.height = convert(style.height);
            }
        }, 10);
    }

    function mousedown(e) {
        model.x = -Number(view.get().style.left.replace('px', '')) + e.clientX;
        model.y = -Number(view.get().style.top.replace('px', '')) + e.clientY;
        model.y = -Number(view.get().style.top.replace('px', '')) + e.clientY;
        window.addEventListener('mousemove', mousemove);
        window.addEventListener('mouseup', mouseup);
    }

    function mousemove(e) {
        view.get().style.left = e.clientX - model.x + 'px';
        view.get().style.top = e.clientY - model.y + 'px';
    }

    function mouseup(e) {
        changeFocus();
        const style = view.get().style;
        model.x = convert(style.left);
        model.y = convert(style.top);
        context.window.x = convert(style.left);
        context.window.y = convert(style.top);
        window.removeEventListener('mousemove', mousemove);
        window.removeEventListener('mouseup', mouseup);
    }

    obj.get = view.get;
    obj.head = (...args) => view.appendTo('head', ...args);
    obj.content = (...args) => view.appendTo('content', ...args);

    return obj;

}