import { HtmlView } from 'gml-html';
import template from './template.html';
import equipmentsTpl from './templates/equipments.html';
import equipmentsItemTpl from './templates/equipmentsItem.html';
import vehiclebudgetsTpl from './templates/vehiclebudgets.html';
import vehiclebudgetsItemTpl from './templates/vehiclebudgetsItem.html';
import vehicleordersTpl from './templates/vehicleorders.html';
import vehicleordersItemTpl from './templates/vehicleordersItem.html';

import equipmentbudgetsTpl from './templates/equipmentbudgets.html';
import equipmentbudgetsItemTpl from './templates/equipmentbudgetsItem.html';
import equipmentordersTpl from './templates/equipmentorders.html';
import equipmentordersItemTpl from './templates/equipmentordersItem.html';

import vehicleAvailabilityTpl from './templates/vehiclesAvailability.html';
import vehicleAvailabilityItemTpl from './templates/vehiclesAvailabilityItem.html';

import versionsTpl from './templates/versions.html';
import versionsItemTpl from './templates/versionsItem.html';
import * as style from './style.scss';
import Icon from '../icon/Icon';
import Window from '../window/window';
import Explorer from './explorer';

const templates = {
    versions: {
        template: versionsTpl,
        itemTemplate: versionsItemTpl,
        filters: ['name', 'description']
    },
    equipements: {
        template: equipmentsTpl,
        itemTemplate: equipmentsItemTpl,
        filters: ['name', 'equipmentFamily', 'id']
    },
    vehiclebudgets: {
        template: vehiclebudgetsTpl,
        itemTemplate: vehiclebudgetsItemTpl,
        filters: ['client.name', 'user.surname & user.name']
    },
    vehicleorders: {
        template: vehicleordersTpl,
        itemTemplate: vehicleordersItemTpl,
        filters: ['user.surname & user.name']
    },
    equipmentbudgets: {
        template: equipmentbudgetsTpl,
        itemTemplate: equipmentbudgetsItemTpl,
        filters: ['client.name', 'user.surname & user.name']
    },
    equipmentorders: {
        template: equipmentordersTpl,
        itemTemplate: equipmentordersItemTpl,
        filters: ['user.surname & user.name']
    },
    vehicleAvailability: {
        template: vehicleAvailabilityTpl,
        itemTemplate: vehicleAvailabilityItemTpl,
        filters: ['model', 'description']
    }
};

export default async function ({ locale, system, thread }) {
    const context = {};
    const view = HtmlView(template, style, locale.get());
    view.style(system.deviceInfo().deviceType);
    view.clear('icons');
    view.get('icons').appendChild(Icon({
        title: 'MACCHINE',
        icon: 'folder',
        href: '/it/esplora/macchine'
    }).get());
    view.get('icons').appendChild(Icon({
        title: 'ATTREZZATURE',
        icon: 'folder',
        href: '/it/esplora/attrezzature'
    }).get());
    view.get('icons').appendChild(Icon({
        title: 'OFFERTE MACCHINE',
        icon: 'assignment',
        href: '/it/esplora/offerte-macchine'
    }).get());
    view.get('icons').appendChild(Icon({
        title: 'OFFERTE ATTREZZATURE',
        icon: 'assignment',
        href: '/it/esplora/offerte-attrezzature'
    }).get());
    view.get('icons').appendChild(Icon({
        title: 'ORDINI MACCHINE',
        icon: 'assignment_turned_in',
        href: '/it/esplora/ordini-macchine'
    }).get());
    view.get('icons').appendChild(Icon({
        title: 'ORDINI ATTREZZATURE',
        icon: 'assignment_turned_in',
        href: '/it/esplora/ordini-attrezzature'
    }).get());
    view.get('icons').appendChild(Icon({
        title: 'DISPONIBILITÁ MACCHINE',
        icon: 'calendar_today',
        href: '/it/esplora/disponibilita-macchine'
    }).get());

    view.destroy = function () {

    };

    view.navigate = async function (title, tableName, { search }) {
        await createWindow(title.replace('-', ' '), tableName, search);
    };

    context.window = {
        x: system.deviceInfo().width > 1024 ? 260 : 50,
        y: 100,
        height: system.deviceInfo().height - 200,
        width: Math.min(system.deviceInfo().width - 200, 600)
    };

    context.focuses = [];
    context.focusIndex = 0;

    async function createWindow(title, name, search = {}) {
        context.focuses.push(await Window({
            thread,
            system,
            context,
            locale,
            parent: view.get(),
            title,
            App: Explorer.partial(templates[name], system.db[name], name)
        }));
        context.focusIndex = context.focuses.length - 1;
        await context.focuses[context.focusIndex].startApp(search[Object.keys(search)[0]]);

        return context.focuses[context.focusIndex];
    }


    return view;
}
