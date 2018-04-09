function perc(key, value, { width, height, scale }) {
    if (value.toString().indexOf('%') === -1) return value;
    const percentage = parseFloat(value.replace('%', '')) / 100;
    switch (key) {
        case 'x':
        case 'width':
            return percentage * width / scale;
        case 'y':
        case 'height':
            return percentage * height / scale;
            break;
        default:
            return value;
    }
}

function scale(key, value, scale) {
    switch (key) {
        case 'x':
        case 'y':
        case 'width':
        case 'height':
            return value * scale;
            break;
        case 'pivot':
            return {x: value.x * scale, y: value.y*scale};
        default:
            return value;
    }
}

function getX(type, { width = 0 }) {
    switch (type) {
        case 'left':
            return 0;
        case 'right':
            return width;
        default:
            return width / 2;
    }
}

function getY(type, { height = 0 }) {
    switch (type) {
        case 'top':
            return 0;
        case 'bottom':
            return height;
        default:
            return height / 2;
    }
}

export function Percentages({ style, info }) {
    Object.keys(style).forEach(key => {
        style[key] = perc(key, style[key], info);
    })
}


export function Parent(parent) {
    return function ({ style, info }) {
        const { anchor = {}, x = 0, y = 0 } = parent(info.designType);
        style.x = (style.x || 0) + x + getX(anchor.x, info);
        style.y = (style.y || 0) + y + getY(anchor.y, info);
    }
}

export function Defaults({ style }) {
    ['x', 'y', 'width', 'height'].forEach(function (key) {
        style[key] = style[key] || 0
    })
}

export function Scale({ style, info }) {
    return Object.keys(style).forEach(key => {
        style[key] = scale(key, style[key], info.scale)
    })
}

export function Anchor({ style }) {
    const { x = 0, y = 0, anchor = {} } = style;
    style.x = x - getX(anchor.x, style);
    style.y = y - getY(anchor.y, style);
}
