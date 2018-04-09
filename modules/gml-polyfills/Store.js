const em = EventEmitter();
let referenceId = 0;
let isCollecting = false;

function defineProps(store, key, target, globalKey) {
    Object.defineProperty(store, key, {
        get: function () {
            em.emit('get', { value: target[key], globalKey });
            return target[key];
        },
        set: function (newValue) {
            const diffs = target[key] !== newValue;
            target[key] = newValue;
            (diffs || isCollecting) && em.emit(globalKey.toString(), target[key])
        },
        enumerable: true
    });
}


function getter(fn) {
    let ret = '';
    const rem = em.on('get', function(p) {
        ret = p;
        isCollecting = false;
    });
    fn();
    rem();
    return ret;
}

Object.prototype.reactive = function () {
    const store = {};
    const target = this;

    Object.keys(target).forEach(function (key) {
        let globalKey = referenceId.toString();
        const isFunction = target[key] instanceof Function;
        if (isFunction) {
            let get = getter(target[key]);
            globalKey = get.globalKey;
            target[key] = get.value;
            em.on(globalKey, value => target[key] = value)
        } else {
            referenceId++;
        }
        defineProps(store, key, target, globalKey);
        if (!isFunction && store[key] instanceof Array) {
            const oldPush = store[key].push;
            const oldSplice = store[key].splice;
            store[key].push = function () {
                oldPush.apply(store[key], arguments);
                em.emit(globalKey.toString(), store[key])
            };
            store[key].splice = function () {
                oldSplice.apply(store[key], arguments);
                em.emit(globalKey.toString(), store[key])
            };
        }
    });

    return store;
};

Object.prototype.connect = function (callback) {
    const store = this;
    const remove = Object.keys(store)
        .map(key => {
            isCollecting = true;
            const { globalKey } = getter(() => {
                store[key] = store[key];
            });
            return em.on(globalKey, function (v) {
                store[key] = v;
                callback(store, key)
            });
        });
    callback(store, '');
    return () => remove.forEach(r => r());
}
