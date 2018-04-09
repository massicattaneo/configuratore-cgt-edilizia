export default function (string) {
    string.split('.')
        .reduce(function (obj, b) {
            if (b.indexOf('(') !== -1) {
                const fn = b.substr(0, b.indexOf('('));
                const str = b.substr(b.indexOf('(') + 1);
                const params = str.substr(0, str.length - 1).split(',')
                    .map(a => a.trim().match(/"*([^"]*)"*/)[1].match(/'*([^']*)'*/)[1]);
                obj[fn](...params);
            } else {
                return obj[b];
            }
        }, window);
}
