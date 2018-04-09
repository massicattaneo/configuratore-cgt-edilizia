function createHTMLNode(markup) {
    var div = document.createElement('div');
    div.innerHTML = markup;
    return div.children[0];
}


export default function Renderer({ id = 'gml-canvas', container, mode } = {}) {
    const renderer = {};
    const children = [];
    const canvas = createHTMLNode('<canvas id="' + id + '" />');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.display = 'block';

    const designModes = [];
    const info = {
        width: 0,
        height: 0,
        scale: 1,
        designType: '',
        designWidth: 0,
        designHeight: 0
    };


    renderer.addDesignMode = function (designType, params = {}) {
        const { condition, designWidth, designHeight } = params;
        designModes.unshift({ designType, condition, designWidth, designHeight });
        updateDesignMode();
        return renderer;
    };

    renderer.resize = function () {
        updateDesignMode();
        const windowWidth = window.getComputedStyle(container).width.replace('px', '');
        const windowHeight = window.getComputedStyle(container).height.replace('px', '');
        const gameRatio = info.designWidth / info.designHeight;
        const windowRatio = windowWidth / windowHeight;
        if (windowRatio > gameRatio) {
            info.scale = windowHeight / info.designHeight;
            canvas.width = info.width = windowWidth;
            canvas.height = info.height = info.designHeight * info.scale;
        } else {
            info.scale = windowWidth / info.designWidth;
            canvas.width = info.width = info.designWidth * info.scale;
            canvas.height = info.height = windowHeight;
        }
        renderer.render();
    };

    if (mode === 'canvas') {
        container.appendChild(canvas);
        renderer.render = function () {
            canvas.getContext('2d').clearRect(0, 0, container.width, container.height);
            children.forEach(function (child) {
                if (child.renderable) {
                    child.render({ctx: canvas.getContext('2d'), info});
                }
            })
        };
    } else {
        renderer.render = function () {
            for (var i = 0; i < container.children.length; i++) {
                container.removeChild(container.children[0])
            }
            children.forEach(function (child) {
                if (child.renderable) {
                    const element = document.createElement('div');
                    container.appendChild(element);
                    child.render({info, container, element});
                    container.removeChild(element);
                }
            })
        };
    }



    renderer.push = function (displayObjects) {
        children.push(...Object.keys(displayObjects).map(key => displayObjects[key]));
    };

    function updateDesignMode() {
        const { designType = '', designWidth = 0, designHeight = 0 } =
            designModes
                .filter(item => item.condition())
                .concat({})[0];
        info.designType = designType;
        info.designWidth = designWidth;
        info.designHeight = designHeight;
    }

    return renderer;
}