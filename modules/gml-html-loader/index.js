const htmlToJson = require('./htmlToJson');

module.exports = function (source) {
    return `export const template = ${JSON.stringify(htmlToJson(source))}`;
};
