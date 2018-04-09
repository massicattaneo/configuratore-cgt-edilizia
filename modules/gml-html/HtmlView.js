function addItem(node, items) {

    Object.keys(node.attributes).map(key => node.attributes[key])
        .filter(attr => {
            return attr.name && attr.name.indexOf('#') === 0;
        })
        .forEach(item => {
            items[item.name.substr(1)] = node;
            node.removeAttribute(item.name);
        });
}

function exploreNode(node, before) {
    before(node);
    for (let i = 0; i < node.children.length; i++) {
        exploreNode(node.children[i], before)
    }
}

function cssStyleName(string) {
    switch (string) {
    case 'x':
        return 'left';
    case 'y':
        return 'top';
    case 'alpha':
        return 'opacity';
    default:
        return string.split('').map(char => char.toUpperCase() === char ? '-' + char.toLowerCase() : char).join('');
    }
}

function cssStyleValue(value, key) {
    if (key === 'alpha') return value;
    if (key === 'zIndex') return value;
    if (!isNaN(value)) return parseInt(value, 10) + 'px';
    return value;
}

export function HtmlStyle(style) {
    return Object.keys(style).map(key => `${cssStyleName(key)}: ${cssStyleValue(style[key], key)}`).join(';')
}

export function Node(markup) {
    const div = document.createElement('div');
    div.innerHTML = markup;
    return div.children[0];
}

export function HtmlView(markup, styles, variables = {}) {
    const regEx = new RegExp(`\{\{([^}}]*)\}\}`, 'g');
    while (markup.match(regEx)) {
        (markup.match(regEx))
            .map(variable => variable.replace('{{', '').replace('}}', ''))
            .forEach(function (variable) {
                const replace = variable.split('.').reduce((val, item) => val[item] || '', variables);
                markup = markup.replace(`{{${variable}}}`, replace);
            });
    }

    const node = Node(markup);
    const view = {};
    const items = {};

    exploreNode(node, function (n) {
        return addItem(n, items);
    });

    view.get = item => items[item] || node;
    view.style = (orientation, override = {}) => {
        Object.keys(styles).forEach(key => {
            let style = styles[key];
            if (style.name) {
                let name = style.name.substr(1);
                let item = items[name];
                if (item) {
                    const st = HtmlStyle(Object.assign({}, styles[key](orientation), override[name] || {}));
                    item.style.cssText = st
                }
            }
        })
    };
    view.content = function (o) {
        Object.keys(o).forEach(key => {
            exploreNode(node, function (n) {
                const regEx = new RegExp(`{{${key}}}`, 'g');
                n.innerHTML = n.innerHTML.replace(regEx, o[key]);
                Object.keys(n.attributes)
                    .map(an => node.attributes[an])
                    .forEach(item => {
                        if (item)
                            item.value = item.value.replace(regEx, o[key])
                    })
            });
        })
    };
    view.appendTo = function (item, childMarkup, childStyles, variables = {}) {
        const childView = HtmlView(childMarkup, childStyles, variables);
        view.get(item).appendChild(childView.get());
        return childView;
    };
    view.appendFirst = function (item, childMarkup, childStyles, variables = {}) {
        const childView = HtmlView(childMarkup, childStyles, variables);
        view.get(item).insertBefore(childView.get(), view.get(item).children[0]);
        return childView;
    };
    view.clear = function (item) {
        view.get(item).innerHTML = '';
        return view;
    };

    return view;
}