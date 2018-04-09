const webpack = require("webpack");
const webpackMiddleware = require("webpack-dev-middleware");
const webpackHotMiddleware = require("webpack-hot-middleware");
const config = require("./webpack.config.dev.js");
const path = require('path');

module.exports = function (app, express) {

    const compiler = webpack(config);
    const middleware = webpackMiddleware(compiler, {
        publicPath: config.output.publicPath,
        contentBase: "../src",
        stats: {
            colors: true,
            hash: false,
            timings: true,
            chunks: false,
            chunkModules: false,
            modules: false
        }
    });

    app.use(middleware);
    app.use(webpackHotMiddleware(compiler));

    app.use(express.static(__dirname));

    return function response(req, res) {
        res.write(
            middleware.fileSystem.readFileSync(
                path.join(__dirname, "dist/index.html")
            )
        );
        res.end();
    }
};