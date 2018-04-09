const scssToJson = require('./scssToJson');


module.exports = function (source) {
    let styles = scssToJson(source);
    let exp = `export var tweens = ${JSON.stringify(styles.animations || {})};`;
    Object.keys(styles).forEach(id => {
        const style = styles[id].style;
        const modes = styles[id].modes || {};
        Object.keys(modes).forEach(mode => {
            modes[mode] = Object.assign({}, style, modes[mode]);
        });
        exp += `export function $${id}(mode) {
            var style = ${JSON.stringify(style)};  
            var modes = ${JSON.stringify(modes)};  
            return modes[mode] || style;
        };`;
    });
    return exp;
};
