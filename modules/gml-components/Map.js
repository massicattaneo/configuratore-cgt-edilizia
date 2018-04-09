import {Percentages, Defaults, Scale, Anchor} from "../../modules/gml-scss-loader/Utils";
import DisplayObject from './DisplayObject';

export function Map(style, {map, system}) {
    return DisplayObject(style)
        .before(Defaults)
        .before(Percentages)
        .before(Scale)
        .before(Anchor)
        .draw(({ ctx, style, info }) => {
            map.forEach(function (line, y) {
                const gridX = style.grid.split(' ')[0];
                const gridY = style.grid.split(' ')[1];
                const posY = y * gridY;
                line.forEach(function (cell, x) {
                    if (cell !== '' && cell !== ' ') {
                        const posX = x * gridX;
                        const res = system.resource(style.sprite + '/' + cell + '.png');
                        ctx.drawImage(res.data,
                            (res.x || 0),
                            (res.y || 0),
                            res.width,
                            res.height,
                            posX * info.scale + style.x,
                            posY * info.scale + style.y,
                            res.width * style.scale * info.scale,
                            res.height * style.scale * info.scale
                        );
                    }
                })
            });
        });
}