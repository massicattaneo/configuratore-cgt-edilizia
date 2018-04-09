function toCamelCase(string) {
    if (string.match(/\s|-|_/)) {
        return string.toLowerCase()
            .match(/([^\s|_|-]*)/g)
            .reduce((p, c) => p + c.charAt(0).toUpperCase() + c.slice(1).toString().toLowerCase());
    } else if (!string.match(/[a-z]/)) {
        return string.toLowerCase();
    }
    return string;
}
function removeNewLines(string) {
    return string.replace(/(\r\n|\n|\r)/gm, '');
}

function trimDoubleSpaces(string) {
    return string.replace(/[\s]\s*/g, ' ').trim().replace(/>\s</g, '><');
}

function getElementName(tag) {
    const position = tag.indexOf(' ');
    return tag.substr(0, position === -1 ? undefined : position);
}

function getElementAttributes(strAttributes) {
    const attributes = {};
    strAttributes.trim()
        .split(/([^"]+="[^"]+"\s)/)
        .map(str => str.trim())
        .filter(str => str !== '')
        .forEach((attr) => {
            let value = attr.substr(attr.indexOf('=') + 2, attr.length - attr.indexOf('=') - 3);
            value = isNaN(value) ? value : parseFloat(value);
            attributes[toCamelCase(attr.substr(0, attr.indexOf('=')))] = value;
        });
    return attributes;
}

function htmlToJson(string) {
    let ret = {};
    trimDoubleSpaces(removeNewLines(string))
        .split(/(<[^<]*>)/)
        .filter(str => str !== '')
        .map(str => str.trim())
        .map((str) => {
            if (str[0] !== '<') return { type: 'value', content: str };
            if (str[str.length - 2] === '/') return { type: 'openClose', content: str.substr(1, str.length - 3) };
            if (str[1] === '/') return { type: 'close', content: str.substr(2, str.length - 3) };
            return { type: 'open', content: str.substr(1, str.length - 2) };
        })
        .map((tag, index, a) => {
            return {
                content: tag.content,
                addValue: tag.type === 'value',
                openChild: index !== 0 && (tag.type === 'open' || tag.type === 'openClose'),
                addChildInfo: tag.type === 'open' || tag.type === 'openClose',
                closeChild: index !== a.length - 1 && (tag.type === 'close' || tag.type === 'openClose')
            };
        })
        .forEach((o) => {
            if (o.openChild) {
                const newChild = {};
                newChild.parent = ret;
                ret.children.push(newChild);
                ret = newChild;
            }
            if (o.addChildInfo) {
                ret.children = [];
                ret.name = getElementName(o.content);
                ret.attributes = getElementAttributes(o.content.substr(ret.name.length));
                ret.value = '';
            }
            if (o.addValue) {
                ret.value = o.content;
            }
            if (o.closeChild) {
                const parent = ret.parent;
                delete ret.parent;
                ret = parent;
            }
        });

    return ret;
}

module.exports = htmlToJson;
