const setItem = (name, value, exdays, path) => {
    const exDate = new Date();
    exDate.setDate(exDate.getDate() + exdays);
    const vl = `${encodeURI(value) + ((exdays === null) ? '' : `; expires=${exDate.toUTCString()}`)}; path=${path}`;
    document.cookie = `${name}=${vl}`;
};

const getItem = (name) => {
    let cValue = document.cookie;
    let cStart = cValue.indexOf(` ${name}=`);
    let cEnd;
    if (cStart === -1) {
        cStart = cValue.indexOf(`${name}=`);
    }

    if (cStart === -1) {
        cValue = null;
    } else {
        cStart = cValue.indexOf('=', cStart) + 1;
        cEnd = cValue.indexOf(';', cStart);
        if (cEnd === -1) {
            cEnd = cValue.length;
        }
        cValue = decodeURI(cValue.substring(cStart, cEnd));
    }

    return cValue;
};

const removeItem = (name, path) => {
    setItem(name, '', -1, path);
};

export default { getItem, setItem, removeItem };
