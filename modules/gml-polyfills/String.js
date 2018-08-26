String.prototype.padLeft = function (size, char) {
    if (size === 0) {
        return '';
    }
    return (Array(size + 1).join(char) + this).slice(-size);
};

String.prototype.padRight = function (size, char) {
    if (size === 0) {
        return '';
    }
    return (this + Array(size + 1).join(char)).substr(0, Math.max(this.length, size));
};
