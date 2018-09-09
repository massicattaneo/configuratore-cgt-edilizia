import { HtmlView } from 'gml-html';
import template from './template.html';
import equipmentsTpl from './equipments.html';
import equipmentsItemTpl from './equipmentsItem.html';
import * as style from './style.scss';
import Icon from '../icon/Icon';
import Window from '../window/window';
import Explorer from './explorer';

export default async function ({ locale, system, thread }) {
    const context = {};
    const view = HtmlView(template, style, locale.get());
    view.style(system.deviceInfo().deviceType);

    if (Number(system.store.userAuth) === 0) {
        view.clear('icons').get('icons').appendChild(Icon({
            title: 'MACCHINE',
            icon: 'vehicles',
            href: '/it/esplora/macchine'
        }).get());
    }
    view.get('icons').appendChild(Icon({
        title: 'ATTREZZATURE',
        icon: 'equipments',
        href: '/it/esplora/attrezzature'
    }).get());

    view.destroy = function () {

    };

    view.navigate = async function (title, tableName) {
        await createWindow(title, tableName);
    };

    context.window = {
        x: system.deviceInfo().width > 1024 ? 260 : 50,
        y: 100,
        height: system.deviceInfo().height - 200,
        width: Math.min(system.deviceInfo().width - 200, 600)
    };

    context.focuses = [];
    context.focusIndex = 0;

    async function createWindow(title, name) {
        context.focuses.push(await Window({
            thread,
            system,
            context,
            locale,
            parent: view.get(),
            title,
            App: Explorer.partial(equipmentsTpl, equipmentsItemTpl, system.db[name], name),
        }));
        context.focusIndex = context.focuses.length - 1;
        await context.focuses[context.focusIndex].startApp();
        return context.focuses[context.focusIndex];
    }


    return view;
}