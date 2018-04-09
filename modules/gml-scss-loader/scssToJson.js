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

function convertStyleName(name) {
    switch (name) {
        case 'top':
            return 'y';
        case 'left':
            return 'x';
        case 'visibility':
            return 'visible';
        case 'opacity':
            return 'alpha';
        default:
            return toCamelCase(name);
    }
}

function convertStyleValue(string, name) {
    switch (name) {
        case 'top':
        case 'left':
        case 'width':
        case 'height':
        case 'border-width':
        case 'border-radius':
        case 'font-size':
        case 'radius':
            let value = string.replace('px', '');
            value = isNaN(value) ? value : parseFloat(value);
            return value;
        case 'background-image':
            return string.match(/url\('(.*)'\)/)[1];
        case 'border-color':
        case 'fill':
            return parseInt(string.replace(/^#/, ''), 16);
        case 'opacity':
            return parseFloat(string);
        case 'visibility':
            return string === 'visible';
        case 'pivot':
            const pivots = string.replace('px', '').split(' ');
            return { x: Number(pivots[0].replace('px', '')), y: Number(pivots[1].replace('px', '')) };
        case 'anchor':
            const anchors = string.replace('px', '').split(' ');
            return { x: anchors[0], y: anchors[1] };
        case 'transform':
            let match = string.match(/scale\(([^)]*)\)/);
            const scale = match && match.length ? match[1].split(',').map(i => Number(i.trim())) : [1, 1];
            match = string.match(/skew\(([^)]*)\)/);
            const skew = match && match.length ? match[1].split(',').map(i => Number(i.trim().replace('deg', '') * Math.PI / 180)) : [0, 0];
            match = string.match(/translate\(([^)]*)\)/);
            const translate = match && match.length ? match[1].split(',').map(i => Number(i.trim().replace('px', ''))) : [0, 0];
            match = string.match(/rotate\(([^)]*)\)/);
            const rotate = match && match.length ? Number(match[1].trim().replace('deg', '') * Math.PI / 180) : 0
            return [].concat(scale[0]).concat(skew).concat(scale[1]).concat(translate).concat(rotate);
        default:
            return string;
    }
}

function generateStyle(str) {
    return str.split(';')
        .map(style => style.trim())
        .filter(style => style !== '')
        .map((style) => {
            const name = style.substr(0, style.indexOf(':')).trim();
            const value = style.substr(style.indexOf(':') + 1).trim();
            return { name: convertStyleName(name), value: convertStyleValue(value, name) };
        })
}

function merge(key, previous, next, percentage) {
    switch (key) {
        case 'left':
        case 'right':
        case 'top':
        case 'bottom':
        case 'x':
        case 'y':
            let ret = previous + (next - previous)* percentage;
            return parseInt(ret);
        default:
            return previous;
    }
}

function scssToJson(str) {
    var ret = {};
    const string = str.replace(/(\r\n|\n|\r)/gm, '').replace(/[\s]\s*/g, ' ').trim();

    function createNewRule(isStr) {
        const id = isStr.replace(/"/g, '').trim();
        return ret[id] || (ret[id] = { modes: {}, style: {} });
    }

    string.match(/[^{]*{[^{]*}/g)
        .filter(rule => rule.match(/#([^{]*)/))
        .map((rule) => {
            const match = rule.match(/#([^{]*)/);
            return {
                index: match.index,
                id: match[1],
                mode: rule.substr(1, match.index - 1).trim(),
                style: generateStyle(rule.match(/{(.*)}/)[1])

            };
        })
        .forEach((o) => {
            const style = {};
            o.style.forEach((stl) => {
                style[stl.name] = stl.value;
            });
            const newStyle = createNewRule(o.id);
            if (o.index === 0) {
                Object.assign(newStyle.style, style);
            } else {
                if (!newStyle.modes[o.mode]) {
                    newStyle.modes[o.mode] = {};
                }
                const s = newStyle.modes[o.mode];
                Object.assign(s, style);
            }
        });

    ret.animations = {};
    var animations = string.match(/@keyframes[^@]*}}/g) || [];
    animations.forEach(function (keyframes) {
        var animationName = keyframes.match(/\s([^@{]*)\s/)[1].trim();
        var memo = {}; //defaults values;
        var lastPercentage = 0;
        const percentages = keyframes.match(/\d*%\s{[^}]*}/g).map(step => Number(step.match(/(\d*)%/)[1]));
        ret.animations[animationName] = new Array(1000).fill(0).map((index, percentage) => {
            const regEx = new RegExp(`[^\\d]${percentage/10}%\\s{[^}]*}`, 'g');
            const step = keyframes.match(regEx);
            if (step) {
                const array = generateStyle(step[0].match(/{(.*)}/)[1]);
                const rules = {};
                lastPercentage = percentage/10;
                array.forEach((stl) => {
                    rules[stl.name] = stl.value;
                });
                memo = rules;
            } else {
                const nextPercentage = percentages[Math.min(percentages.indexOf(lastPercentage)+1, percentages.length)];
                const regEx = new RegExp(`[^\\d]${nextPercentage}%\\s{[^}]*}`, 'g');
                const step = keyframes.match(regEx);
                const array = generateStyle(step[0].match(/{(.*)}/)[1]);
                const rules = {};
                array.forEach((stl) => {
                    let perc = ((percentage/10)-lastPercentage)/(nextPercentage-lastPercentage);
                    rules[stl.name] = merge(stl.name, memo[stl.name], stl.value, perc);
                });
                return rules
            }

            return memo;
        });
    });

    return ret;
}

module.exports = scssToJson;
