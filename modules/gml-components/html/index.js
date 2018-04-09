import {Node, HtmlStyle} from 'gml-html';
import {plugin} from 'gml-system';

function htmlDrawer({ system }) {
    return function (type, { map } = {}) {
        switch (type) {
            case 'rectangle':
                return ({ style, element, container }) => {
                    const node = Node(`<div style="${HtmlStyle(style)}; position: absolute;"></div>`);
                    container.insertBefore(node, element);
                }
            case 'image':
                return ({ style, element, container }) => {
                    const resource = system.resource(style.backgroundImage);
                    const { x = 0, y = 0, width = 0, height = 0 } = style;
                    let htmlStyle = HtmlStyle({ x, y, width, height });
                    const node = Node(`<img src="${resource.url}" style="${htmlStyle}; position: absolute;" />`);
                    container.insertBefore(node, element);
                };
                break;
            case 'map':
                return ({ style, element, container, info }) => {
                    map.forEach(function (line, y) {
                        const gridX = style.grid.split(' ')[0];
                        const gridY = style.grid.split(' ')[1];
                        const posY = y * gridY;
                        line.forEach(function (cell, x) {
                            if (cell !== '' && cell !== ' ') {
                                const res = system.resource(style.sprite + '/' + cell + '.png');
                                const posX = x * gridX;
                                let htmlStyle = HtmlStyle({
                                    x:posX * info.scale + style.x, y:posY * info.scale + style.y,
                                    width: Math.ceil(res.width * style.scale * info.scale),
                                    height: Math.ceil(res.height * style.scale * info.scale)
                                });
                                let scaleX = Math.ceil(res.data.width/2*info.scale);
                                let scaleY = Math.ceil(res.data.height/2*info.scale);
                                const node = Node(`<div style="${htmlStyle}; 
                                    background-size: ${scaleX}px ${scaleY}px; 
                                    background-image: url(${res.data.src});                                    
                                    background-position: ${-Math.ceil(res.x*info.scale/2)}px ${-Math.ceil(res.y*info.scale/2)}px;
                                    position: absolute;"></div>`);
                                container.insertBefore(node, element);
                            }

                                                })
                                            });
                                        };
                                        break;
                                }
                            }
                        }


                        plugin(htmlDrawer);