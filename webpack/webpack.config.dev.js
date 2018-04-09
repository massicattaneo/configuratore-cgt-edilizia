const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const devServer = 'webpack-hot-middleware/client?reload=true';
const fs = require('fs');

const config = {
    entry: {
        system: [
            'babel-regenerator-runtime',
            devServer,
            './src/system/system.js'
        ]
    },
    output: {
        path: path.join(__dirname, '/dist/'),
        filename: '[name].bundle.js'
    },
    devtool: 'eval-source-map',
    resolveLoader: {
        modules: ['modules/', 'node_modules']
    },
    module: {
        loaders: [
            {
                test: /\.hbs$/,
                loader: 'handlebars-loader'
            },
            {
                test: /\.js$/,
                use: 'babel-loader',
                exclude: /node_modules/
            },
            {
                test: /\.(jpe?g|gif|png|svg|woff|ttf|wav|mp3)$/,
                loader: 'file'
            },
            {
                test: /.(html)$/,
                exclude: [
                    path.resolve(__dirname, 'index.html')
                ],
                use: 'raw-loader'
            },
            {
                test: /.(scss)$/,
                use: 'gml-scss-loader'
            },
            {
                test: /\.json$/,
                use: 'json-loader'
            },
            {
                test: /\.map$/,
                use: 'gml-map-loader'
            }
        ]
    },
    resolve: {
        extensions: ['.js'],
        modules: ['modules/','node_modules'],
        descriptionFiles: ['package.json']
    },
    plugins: [
        new HtmlWebpackPlugin({
            chunks: ['system'],
            template: 'src/index.hbs',
            inject: false
        }),
        new CopyWebpackPlugin([
            { from: './src/css', to: 'css' },
            { from: './src/localization', to: 'localization' },
            { from: './src/assets', to: 'assets' }
        ]),
        new webpack.HotModuleReplacementPlugin(),
    ]
};

module.exports = config;
