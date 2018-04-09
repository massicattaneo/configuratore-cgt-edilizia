import DisplayObject from './DisplayObject';
import {Scale, Parent} from "../../modules/gml-scss-loader/Utils";

export function Group(parentStyle, items) {
    let displayObject = DisplayObject(parentStyle);
    Object.keys(items).forEach(key => {
        items[key]
            .before(Parent(parentStyle))
            .before(function ({ ctx, info, element, container }) {
                const { width = 0, height = 0 } = parentStyle(info.designType);
                let style = {
                    x: -(width * info.scale) / 2,
                    y: -(height * info.scale) / 2,
                    width: width * info.scale,
                    height: height * info.scale
                };
                Parent(parentStyle)({ info, style });
                if (element) {
                    container.style.position = 'absolute';
                    container.style.left = -style.x + 'px';
                    container.style.top = -style.y + 'px';
                    container.style.width = style.width + 'px';
                    container.style.height = style.height + 'px';

                    container.parentNode.style.overflow = 'hidden';
                    container.parentNode.style.position = 'absolute';
                    container.parentNode.style.left = style.x + 'px';
                    container.parentNode.style.top = style.y + 'px';
                    container.parentNode.style.width = style.width + 'px';
                    container.parentNode.style.height = style.height + 'px';
                }
                if (ctx && parentStyle(info.designType).overflow === 'hidden') {
                    ctx.beginPath();
                    ctx.rect(style.x, style.y, style.width, style.height);
                    ctx.closePath();
                    ctx.clip();
                }
            })
    });
    return displayObject
        .draw((params) => {
            if (params.element) {
                const root = document.createElement('div');
                const container = document.createElement('div');
                const element = document.createElement('div');
                params.container.appendChild(root);
                root.appendChild(container);
                container.appendChild(element);
                Object.keys(items).forEach(key => {
                    items[key].render({info: params.info, container, element});
                });
            } else {
                Object.keys(items).forEach(key => {
                    items[key].render(params);
                });
            }

        });
}