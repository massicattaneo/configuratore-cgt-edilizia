const mapLoader = require('./mapLoader');

module.exports = function (source) {
    var s = `export default ${JSON.stringify(mapLoader(source))}`;
    return s;
};
