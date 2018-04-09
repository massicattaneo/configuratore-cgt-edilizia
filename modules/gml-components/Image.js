import {Percentages, Scale, Anchor, Defaults} from "../../modules/gml-scss-loader/Utils";
import DisplayObject from './DisplayObject';

export function Image(style, { system }) {
    return DisplayObject(style)
        .before(Defaults)
        .before(Percentages)
        .before(Scale)
        .before(Anchor)
        .draw(({ ctx, style }) => {
            const resource = system.resource(style.backgroundImage);
            const img = resource.data;
            const { x = 0, y = 0, width = 0, height = 0 } = style;
            ctx.drawImage(img, x , y, width, height);
        });


}