export function Renderable(scope, items) {
    scope.renderable = true;
    scope.render = (ctx, info) => {
        Object.keys(items).forEach(key => {
            items[key].render(ctx, info)
        });
    };
}