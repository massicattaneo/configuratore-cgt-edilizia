import {plugin} from 'gml-system';

function canvasDrawer({ system }) {
    return function (type, { map } = {}) {
        switch (type) {
            case 'rectangle':
                return ({ ctx, style }) => {
                    ctx.beginPath();
                    const { x = 0, y = 0, width = 0, height = 0, backgroundColor } = style;
                    ctx.fillStyle = backgroundColor;
                    ctx.rect(x, y, width, height);
                    ctx.fill();
                };
                break;
            case 'image':
                return ({ ctx, style }) => {
                    const resource = system.resource(style.backgroundImage);
                    const img = resource.data;
                    const { x = 0, y = 0, width = 0, height = 0 } = style;
                    ctx.drawImage(img, x, y, width, height);
                };
                break;
            case 'map':
                return ({ ctx, style, info }) => {
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
                };
                break;
        }
    }
}


plugin(canvasDrawer);
