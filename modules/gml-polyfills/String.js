String.prototype.padLeft = function (size, char) {
    if (size === 0) {
        return '';
    }
    return (Array(size + 1).join(char) + this).slice(-size);
};
