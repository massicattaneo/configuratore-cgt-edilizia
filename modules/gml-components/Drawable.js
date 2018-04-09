import {Percentages, Scale, Anchor, Defaults} from "../../modules/gml-scss-loader/Utils";
import DisplayObject from './DisplayObject';

export function Drawable(style, drawer) {
    return DisplayObject(style)
        .before(Defaults)
        .before(Percentages)
        .before(Scale)
        .before(Anchor)
        .draw(drawer);
}