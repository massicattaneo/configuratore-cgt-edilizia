const em = EventEmitter();
let referenceId = 0;
let isCollecting = false;
let isUpdating = false;

function defineProps(store, key, target, globalKey) {
    Object.defineProperty(store, key, {
        get: function () {
            em.emit('get', { value: target[key], globalKey });
            return target[key];
        },
        set: function (newValue) {
            const diffs = target[key] !== newValue;
            target[key] = newValue;
            (diffs || isCollecting && !isUpdating) && em.emit(globalKey.toString(), target[key]);
        },
        enumerable: true
    });
}


function getter(fn) {
    let ret = '';
    const rem = em.on('get', function (p) {
        ret = p;
        isCollecting = false;
    });
    fn();
    rem();
    return ret;
}

(function () {
    function Reactive() {}
    window.rx = {
        create: function (target) {
            const store = new Reactive();
            Object.keys(target).forEach(function (key) {
                let globalKey = referenceId.toString();
                const isFunction = target[key] instanceof Function;
                if (isFunction) {
                    let get = getter(target[key]);
                    globalKey = get.globalKey;
                    target[key] = get.value;
                    em.on(globalKey, value => target[key] = value);
                } else {
                    referenceId++;
                }
                defineProps(store, key, target, globalKey);
                if (!isFunction && store[key] instanceof Array) {
                    const oldPush = store[key].push;
                    const oldSplice = store[key].splice;
                    store[key].push = function () {
                        oldPush.apply(store[key], arguments);
                        em.emit(globalKey.toString(), store[key]);
                    };
                    store[key].splice = function () {
                        oldSplice.apply(store[key], arguments);
                        em.emit(globalKey.toString(), store[key]);
                    };
                }
            });

            return store;
        },
        connect: function (store, callback) {
            const reactive = (store instanceof Reactive) ? store : window.rx.create(store);
            const remove = Object.keys(reactive)
                .map(key => {
                    isCollecting = true;
                    const { globalKey } = getter(() => {
                        reactive[key] = reactive[key];
                    });
                    return em.on(globalKey, function (v) {
                        reactive[key] = v;
                        callback(reactive, key);
                    });
                });
            callback(reactive, '');
            return () => remove.forEach(r => r());
        },
        update: function (store, props) {
            isUpdating = true;
            Object.keys(store).forEach(function (key) {
                if (props[key] && props[key] instanceof Array) {
                    store[key].splice(0, store[key].length);
                    store[key].push(...props[key]);
                } else if (props[key]) {
                    store[key] = props[key];
                }
            });
            isUpdating = false;
        }
    };
})();
