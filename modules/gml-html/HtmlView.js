function addItem(node, items) {

    for (let i = 0; i < node.attributes.length; i++) {
        if (node.attributes[i].name && node.attributes[i].name.indexOf('#') === 0) {
            items[node.attributes[i].name.substr(1)] = node;
            node.removeAttribute(node.attributes[i].name);
        }
    }
}

function exploreNode(node, before) {
    before(node);
    for (let i = 0; i < node.children.length; i++) {
        exploreNode(node.children[i], before);
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
    return Object.keys(style).map(key => `${cssStyleName(key)}: ${cssStyleValue(style[key], key)}`).join(';');
}

export function Node(markup) {
    const isTable = markup.startsWith('<tr>');
    const div = document.createElement(isTable ? 'table' : 'div');
    div.innerHTML = markup;
    return isTable ? div.children[0].children[0] : div.children[0];
}

const myParsers = {
    toCurrency: (number) => {
        const string = parseFloat(number).toFixed(2);
        const integer = string.split('.')[0].split('').reverse().reduce((array, item, index) => {
            const number = Math.floor(index / 3);
            array[number] = array[number] || [];
            array[number].push(item);
            return array;
        }, []).map(a => a.reverse()).reverse().join('.').replace(/,/g, '');
        const decimals = string.split('.')[1];
        return `${integer},${decimals} €`;
    },
    formatLongDate: function (d) {
        const date = new Date(d);
        return date.formatDay('dddd dd/mm/yyyy', ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']);
    },
    formatShortDate: function (d) {
        const date = new Date(d);
        return date.formatDay('dd/mm/yyyy', []);
    },
    toPercentage: function (d) {
        return `${Number(d).toFixed(2)}%`
    },
    formatTime: function (d) {
        const date = new Date(d);
        return date.formatTime('hh:mm');
    },
    displayBlock: function (d) {
        if (!d) return 'display: none;';
        if (d.toString().replace(/\s/g, '') === '') return 'display: none;';
        return 'display: block;';
    },
    checked: function (d) {
        return d ? 'checked' : ''
    },
    YesNo: function (d) {
        return d ? 'SI' : 'NO'
    },
    fn: function (d) {
        return new Function(d)();
    }
};

export function HtmlView(markup, styles, variables = {}) {
    markup = markup.replace(/\n/g, '');
    let matcher = /\{{#each [^}}]*}}.*{{\/each}}/;
    while (markup.match(matcher)) {
        let myMatch = markup.match(matcher);
        let str = markup.substr(myMatch.index, markup.indexOf('{{/each}}') - myMatch.index + 9);
        markup = markup.replace(str, variables[str.match(/{{#each ([^{{]*)}}/)[1]].map(item => {
            let ret = str.replace(/\{{#each [^}}]*}}/, '').replace('{{/each}}', '').trim();
            if (item instanceof Object) {
                Object.keys(item).forEach(key => {
                    let regEx = new RegExp(`{{this.${key}}}`, 'g');
                    const itemElement = item[key];
                    ret = ret.replace(regEx, itemElement);
                    Object.keys(myParsers).forEach(function (fnName) {
                        regEx = new RegExp(`{{${fnName}\\(this.${key}\\)}}`, 'g');
                        if (ret.match(regEx)) ret = ret.replace(regEx, myParsers[fnName](itemElement));
                    });
                });
                return ret;
            } else {
                let regEx;
                Object.keys(myParsers).forEach(function (fnName) {
                    regEx = new RegExp(`{{${fnName}\\(this\\)}}`, 'g');
                    ret = ret.replace(regEx, item);
                });
                return ret.replace(/{{this}}/g, item);
            }
        }).join(''));
    }

    const regEx = new RegExp(`\{\{([^}}]*)\}\}`, 'g');
    while (markup.match(regEx)) {
        (markup.match(regEx))
            .map(variable => variable.replace('{{', '').replace('}}', ''))
            .forEach(function (variable) {
                Object.keys(myParsers).forEach(function (fnName) {
                    if (variable.indexOf(fnName + '(') === 0) {
                        const r1 = variable.replace(fnName + '(', '').replace(')', '');
                        const r2 = r1.split('.').reduce((val, item) =>
                            val[item] !== undefined ? val[item] : '', variables);
                        markup = markup.replace(`{{${variable}}}`, myParsers[fnName](r2));
                    }
                });
                const replace = variable.split('.').reduce((val, item) =>
                    val[item] !== undefined ? val[item] : '', variables);
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
                    item.style.cssText = st;
                }
            }
        });
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
                            item.value = item.value.replace(regEx, o[key]);
                    });
            });
        });
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
