class Table {
    constructor(array) {
        this.array = array.slice(0);
    }

    valueOf() {
        return this.array;
    }

    first() {
        return this.array[0]
    }

    where(filter) {
        return new Table(this.array.filter(filter))
    }

    select() {
        const args = arguments;
        return new Table(this.array.map(function (item) {
            return [...args].reduce((ret, key) => {
                ret[key] = item[key];
                return ret;
            }, {})
        }));
    }

    sort(fn) {
        return new Table(this.array.slice(0).sort(fn))
    }

    find(fn) {
        return new Table(this.where(fn).value(0));
    }

    join(list, id, joinId) {
        return new Table(this.array.map(item => Object.assign({}, item, list.find(it => it[joinId] === item[id]).first())))
    };

    columns(config) {
        return new Table(this.array.map(item => {
            return Object.keys(item).reduce((ret, key) => {
                ret[config[key] || key] = item[key];
                return ret;
            }, {});
        }))
    }

    reduce(reduce, start) {
        return new Table(this.array.reduce(reduce, start))
    }

    push() {
        this.array.push(...arguments);
        return this;
    }

    splice() {
        this.array.splice(...arguments);
        return this;
    }

    update(column, value) {

    }

}

window.Table = Table;
