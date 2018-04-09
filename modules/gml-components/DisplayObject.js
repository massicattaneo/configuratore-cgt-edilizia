export default function DisplayObject(getStyle) {
    const obj = {};
    let draw = e => e;

    const before = [];
    const after = [];
    let hidden = false;

    obj.before = (...args) => {before.push(...args); return obj;};
    obj.removeBefore = (callback) => before.splice(before.indexOf(callback), 1);
    obj.after = (...args) => {after.push(...args); return obj;};
    obj.draw = callback => {draw = callback; return obj;};
    obj.hide = () => hidden = true;
    obj.show = () => hidden = false;
    obj.render = ({ctx, info, container, element}) => {
        if (hidden) return;
        const style = Object.assign({} , getStyle(info.designType));
        before.forEach(mw => mw({ctx, style, info, container, element}));
        draw({ctx, style, info, container, element});
        after.forEach(mw => mw({ctx, style, info, container, element}));
        ctx && ctx.restore();
    };

    return obj;
}