(function () {
    HTMLElement.prototype.addStyle = function () {
        if (typeof arguments[0] === 'object') {
            return addCss.apply(this, arguments);
        } else {
            return addClass.apply(this, arguments);
        }
    };

    function addClass() {
        for (var a = 0; a < arguments.length; a++) {
            var className = arguments[a].trim();
            if (this.className) {
                if (!this.className.match(className)) {
                    this.className += ' ' + className;
                }
            } else {
                this.className = className;
            }
        }
    }

    function addCss(o) {
        var e = this;
        Object.keys(o).forEach(function (k) {
            e.style[k] = o[k];
        })
    }
})();

(function () {
    HTMLElement.prototype.removeStyle = function () {
        if (typeof arguments[0] === 'object') {
            return removeCss.apply(this, arguments);
        } else {
            return removeClass.apply(this, arguments);
        }
    };

    function removeClass() {
        for (var a = 0; a < arguments.length; a++) {
            var className = arguments[a].trim();
            if (this.className.match(className)) {
                this.className = this.className.replace(className, '').replace(/\s\s/g, ' ').trim();
            }
        }
    }

    function removeCss(o) {
        var e = this;
        Object.keys(o).forEach(function (k) {
            e.style[k] = '';
        })
    }
})();