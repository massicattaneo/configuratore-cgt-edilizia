import {Percentages, Defaults, Scale, Anchor} from "../../modules/gml-scss-loader/Utils";
import DisplayObject from './DisplayObject';

export function Rectangle(style) {
    return DisplayObject(style)
        .before(Defaults)
        .before(Percentages)
        .before(Scale)
        .before(Anchor)
        .draw(({ ctx, style }) => {
            ctx.beginPath();
            const { x = 0, y = 0, width = 0, height = 0, backgroundColor } = style;
            ctx.fillStyle = backgroundColor;
            ctx.rect(x, y, width, height);
            ctx.fill();
        });
}