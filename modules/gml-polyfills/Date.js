Date.prototype.formatDay = function (pattern, dayNames) {
    pattern = pattern.replace(/dddd/g, dayNames[this.getDay()]);
    pattern = pattern.replace(/dd/g, this.getDate().toString().padLeft(2, 0));
    pattern = pattern.replace(/mm/g, (this.getMonth() + 1).toString().padLeft(2, 0));
    pattern = pattern.replace(/yyyy/g, this.getFullYear().toString());
    pattern = pattern.replace(/yy/g, this.getFullYear().toString().substr(2, 2));
    return pattern;
};

Date.prototype.formatTime = function (pattern) {
    pattern = pattern.replace(/hh/g, this.getHours().toString().padLeft(2, 0));
    pattern = pattern.replace(/mm/g, this.getMinutes().toString().padLeft(2, 0));
    return pattern;
};