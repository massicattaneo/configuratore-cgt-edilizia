export default function () {
    const obj = {};
    const stack = [];
    let index = -1;
    let isRunning = false;

    function exe(fn = () => {}) {
        if (stack[index + 1]) {
            isRunning = true;
            return stack[++index].call(obj, exe);
        }
        isRunning = false;
    }

    obj.add = function (fn) {
        fn && stack.push(fn);
    };
    obj.exe = function (fn) {
        obj.add(fn);
        if (!isRunning) exe(() => {});
    };
    return obj;
}
