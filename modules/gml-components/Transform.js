export function Transform(transform) {
    return function ({ ctx, info, style }) {
        const { pivot = {} } = style;
        ctx.save();
        ctx.translate(info.width / 2, info.height / 2);
        ctx.translate(transform.x * info.scale, transform.y * info.scale);
        ctx.scale(transform.scale || 1, transform.scale || 1);
        ctx.rotate(transform.rotation * Math.PI / 180);
        ctx.translate(-style.x - (pivot.x || 0), -style.y - (pivot.y || 0));
    }
}