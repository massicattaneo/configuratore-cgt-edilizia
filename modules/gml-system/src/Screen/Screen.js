import Container from 'gml-components/Container';
import Renderer from 'gml-components/Renderer';

export default function Screen({ device } = {}) {

    const screen = {};
    const renderesFullScreen = [];
    const renderers = {};
    const modes = {};
    let activeMode = '';
    let scale = 1;

    const resize = function (e, params) {
        const windowWidth = params.width;
        const windowHeight = params.height;
        const gameRatio = params.gameWidth / params.gameHeight;
        const windowRatio = windowWidth / windowHeight;

        if (windowRatio > gameRatio) {
            /* landscape */
            scale = params.gameHeight / windowHeight;
        } else {
            /* portrait */
            scale = params.gameWidth / windowWidth;
        }
        const center = { x: windowWidth / 2 *scale, y: windowHeight / 2 *scale};

        activeMode = params.designMode;

        renderesFullScreen.forEach(renderer => {
            renderer.resize({ windowWidth, windowHeight, center });
            renderer.getContext().clearRect(0, 0, windowWidth, windowHeight);
            renderer.render();
        });
    };

    screen.fullScreenRenderer = (id) => {
        const renderer = renderers[id] = Renderer();
        renderesFullScreen.push(renderer);
    };

    screen.getMode = () => {
        return activeMode;
    };

    screen.getRenderer = function (id) {
        return renderers[id];
    };

    screen.getDrawScale = (reduce = 1) => scale/reduce;

    screen.addDesignType = (name, object) => {
        modes[name] = object;
    };

    device.onChange().subscribe(resize);

    return screen;
}