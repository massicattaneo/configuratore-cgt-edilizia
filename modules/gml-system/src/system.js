/* eslint require-jsdoc: 'off' */
/* eslint arrow-body-style: 'off' */
/* eslint no-return-assign: 'off' */
/* eslint prefer-destructuring: 'off' */

import Device from './DeviceInfo/DeviceInfo';
import FileLoader from './FileLoader/FileLoader';
import StatsManager from './StatsManager/StatsManager';
import Navigator from './Navigator/Navigator';
import Error from './Error/Error';
import Storage from './Storage/Storage';
import Thread from './Thread/Thread';
import Localization from './Localization/Localization';
import setDocumentDomain from './utils/setDocumentDomain';
import simpleObjectExtend from './utils/simpleObjectExtend';
import Promise from 'gml-event-emitter/Promise';
import Queue from './Thread/Queue';
import cookies from './utils/cookieManager';
import getUrlParameter from './utils/getUrlParameter';
import wait from './Thread/wait';

/**
 * System class
 * @class System
 * @example
 * var system = System({
 *   ua: navigator.userAgent,
 *   config: {
 *      gameId: 'FastAndSexy',
 *      gameType: 'Slot',
 *      statsManager: {
 *          scriptPath: 'webtrekk_v4.min.js',
 *          enabled: true,
 *          host: 'responder.wt-safetag.com',
 *          uri: 'resp/api/get/660499503695122?',
 *          info: {
 *              productGameType: 'casino',
 *              productName: 'FastAndSexy',
 *              subProductGameType: 'slot',
 *              backOfficeProductId: 'FastAndSexy',
 *              dependencies: 'Pandora 2.0, Protocols 2.0',
 *              gameComponent: 'CasinoStudioGames'
 *          }
 *       }
 *    }
 * });
 * @returns {object} a new System
 */
function System({ ua, config = {} }) {
    const system = {
        STATUS: {
            /** 0 -when the system is created */
            READY: 0,
            /** 1 -when it fires window.onload */
            CONTENT_LOADED: 1,
            /** 2 - when system is setup */
            SETUP: 2,
            /** 3 - when the preloader is shown on the screen */
            GAME_SHOW_PRELOAD: 3,
            /** 4 - when you are logged in to the server */
            LOGGED_TO_SERVER: 4,
            /** 5 - when the user can perform any kind of action */
            GAME_READY_TO_PLAY: 5
        },
        ERROR: {
            UNAUTHORIZED: 0,
            GENERAL_ERROR: 1,
            INSUFFICIENT_FUNDS: 2
        }
    };
    const resources = {};
    const bandwidth = { value: 0, sampleSize: 0, evaluationMethod: 'timeBased' };
    let DOM_LOADING = Date.now();
    let audioPlayer = {};

    // *************************************************************************** STORAGE
    const storage = Storage({ prefix: config.appName });
    /**
     * get a storage value
     * @example
     * const value = system.getStorage('name');
     * @method System#removeStorage
     * @param {string} propertyKey - the key of the property to get;
     * @returns {Object/String} the value of the storage property.
     * */
    system.getStorage = function (propertyKey) {
        return storage.get(propertyKey);
    };
    /**
     * set storage values
     * @example
     * system.setStorage({name: 'my name', age: 23});
     * @method System#setStorage
     * @param {object} params - an object where keys represents the key of the storage with their values;
     * @returns {Object} chain to the System object.
     * */
    system.setStorage = (params) => {
        storage.set(params);
        return system;
    };
    /**
     * remove a storage value
     * @example
     * system.removeStorage('name');
     * @method System#removeStorage
     * @param {string} propertyKey - the key of the property to remove;
     * @returns {Object} chain to the System object.
     * */
    system.removeStorage = (propertyKey) => {
        storage.remove(propertyKey);
        return system;
    };
    /**
     * init storage values
     * @example
     * system.initStorage({music: true});
     * @method System#initStorage
     * @param {object} params - an object containing the default values
     * @returns {Object} chain to the System object.
     * */
    system.initStorage = function (params) {
        Object.keys(params).forEach(function (key) {
            const value = system.getStorage(key);
            const obj = {};
            obj[key] = value !== null ? value : params[key];
            storage.set(obj);
        });
        return system;
    };
    // ***************************************************************************  INFO
    const info = rx.create({
        lang: '',
        maxRetry: 3,
        retryTimeout: 2000,
        timeout: 1000,
        activationCode: getUrlParameter('activationCode'),
        version: config.version
    });
    /**
     * retrieves the system info coming from the url and the configuration passed
     * @example
     * const info = system.info();
     * @method System#info
     * @returns {object} an object containing the info.
     * */
    system.info = () => info;
    // *************************************************************************** STATS MANAGER
    const statsManager = StatsManager(system);
    // ***************************************************************************  ERRROR
    const error = Error();
    /**
     * throw a system error
     * @example
     * system.throw('my-error', {origin: 'server'});
     * @method System#throw
     * @param {String} name - the name of the error defined;
     * @param {Object} [params] - the real object error that is thrown;
     * @returns {Object} chain to the System object.
     * */
    system.throw = (name, params = {}) => {
        error.throw(name, params);
        throw 'error';
        return system;
    };
    /**
     * catch a system error
     * @example
     * system.catch()
     * .filter(e => e.origin === 'server') //optional
     * .subscribe(function (error, trace) {
     *   //trace is the statsManager.trace function
     *   trace('item-clicked', event.name);
     * });
     * @method System#catch
     * @returns {Object} an Event stream.
     * */
    system.catch = function () {
        return error.catch({ trace: statsManager.trace });
    };
    // ***************************************************************************  NAVIGATOR
    const navigator = Navigator(system);
    /**
     * emit a system navigator event
     * @example
     * system.navigateTo('button-tap', {name: 'spin'});
     * @method System#navigateTo
     * @param {string} url - the navigation to perform;
     * @param {object} [params] - some params to pass through;
     * @returns {Promise} of the event.
     * */
    system.navigateTo = (url, params) => {
        if (url.indexOf('/') === -1) url = location.pathname + '/' + url;
        history.pushState(params, null, url);
        return navigator.emit(url, params);
    };
    /**
     * listen to a system navigator event
     * @example
     * system.onNavigate('button-tap', function (event, trace) {
     *   //trace is the statsManager.trace function
     *   trace('item-clicked', event.name);
     * });
     * @method System#onNavigate
     * @returns {Object} an Event stream.
     * */
    system.onNavigate = function () {
        return navigator.stream({ trace: statsManager.trace });
    };
    // *************************************************************************** DEVICE
    const device = Device({
        ua,
        assetsQuality: storage.get('assetsQuality'),
        throwError: p => system.throw('system', p)
    });
    /**
     * retrieves the device info coming from the user agent strings and system settings
     * @example
     * const deviceInfo = system.deviceInfo();
     * @method System#deviceInfo
     * @returns {object} an object containing the device info.
     * */
    system.deviceInfo = () => device.info();
    /**
     * stream device events
     * @example
     * system.onDeviceDesignChange()
     * .debounce({ delay: 500 }) //optional
     * .subscribe(function (event, params) {
     *   console.log(event, params)
     * });
     * @method System#onDeviceDesignChange
     * @returns {Object} an Event stream.
     * */
    system.onDeviceDesignChange = () => device.onChange();
    /**
     * set the maximum asset quality
     * @example
     * system.setMaximumDeviceAssetsQuality('1', info => info.deviceType === 'desktop' && info.devicePixelRatio > 1);
     * @param {any} quality - The quality of the assets;
     * @param {function} [callback] - The condition when quality is applied
     * @method System#setMaximumDeviceAssetsQuality
     * @returns {Object} chain to the System object.
     * */
    system.setMaximumDeviceAssetsQuality = (quality, callback) => {
        device.setMaximumAssetsQuality(quality, callback);
        return system;
    };
    /**
     * store the asset quality - it also store it in the storage
     * @example
     * system.storeDeviceAssetsQuality('1', info => info.deviceType === 'desktop' && info.devicePixelRatio > 1);
     * @param {string|number|array|object} quality - The quality of the assets;
     * @param {function} [callback] - The condition when quality is applied
     * @method System#storeDeviceAssetsQuality
     * @returns {Object} chain to the System object.
     * */
    system.storeDeviceAssetsQuality = function (quality, callback) {
        device.setAssetsQuality(quality, callback);
        storage.set({ assetsQuality: device.info().assetsQuality });
        return system;
    };
    /**
     * set a bg music quality
     * @example
     * system.setDeviceBgMusicQuality(0, device => device.os === 'Android' && device.browserName === 'uc');
     * @param {string} quality - The quality of the bg music;
     * @param {function} callback - The condition when quality is applied
     * @method System#setDeviceBgMusicQuality
     * @returns {Object} chain to the System object.
     * */
    system.setDeviceBgMusicQuality = (quality, callback) => {
        device.setBgMusicQuality(quality, callback);
        return system;
    };
    /**
     * @method System#setDeviceResolution
     * @param {number} resolution - the resolution to apply
     * @param {function} [callback] - The condition when resolution is applied
     * @returns {Object} chain to the System object.
     */
    system.setDeviceResolution = (resolution, callback) => {
        device.setResolution(resolution, callback);
        return system;
    };
    /**
     * test the user agent string with a regular expression
     * @example
     * const isSamSung Note3 = system.testDeviceUserAgent(/SM-N9000/);
     * @method System#testDeviceUserAgent
     * @param {string} regEx - The regular expression;
     * @returns {Boolean} the result of the test.
     * */
    system.testDeviceUserAgent = regEx => device.testUserAgent(regEx);
    /**
     * Check if the device is compatible relative to the compatibility matrix "./DeviceInfo/compatibilityMatrix.json"
     * It throws a 'system' error {type: 'BROWSER_UNSUPPORTED',subType: device.info(),description: userAgent }
     * @method system#isDeviceCompatible
     * @param {boolean} [force] - force the result for TESTING PURPOUSE
     * @returns {boolean} if the device is compatible
     */
    system.checkDeviceCompatible = function (force) {
        return device.isCompatible(force);
    };
    // *************************************************************************** FILE LOADER
    const fileLoader = FileLoader(system);
    /**
     * add a loader for files depending on the type (pixi-image, pixi-spine, sound, bg-music, font)
     * @example
     * system.addFileLoader(['font'], FontLoader());
     * @param {array} fileTypes - An array of types;
     * @param {object} loader - An object implementing a load function;
     * @method System#addFileLoader
     * @returns {Object} chain to the System object.
     * */
    system.addFileLoader = (fileTypes, loader) => {
        fileLoader.addLoader(fileTypes, loader);
        return system;
    };
    /**
     * add a manifest containing files info
     * @example
     * system.addFileManifest([{...}], {host: 'http://localhost/test/assets/'});
     * @param {array} manifest - An array of objects containing the info of the files to load;
     * @param {object} [params] - An object implementing a load/totalSize functions;
     * @method System#addFileManifest
     * @returns {Object} chain to the System object.
     * */
    system.addFileManifest = (manifest, params) => {
        fileLoader.addManifest(manifest, params);
        return system;
    };
    /**
     * load files by stage
     * @example
     * const resources = await system.loadStageFiles('preloader')
     *      on('progress', percentage => console.log(percentage))
     *      .start();
     * @param {string|array} stage - A string or array representing the stage/stages name to load;
     * @param {object} [params] - { MaxRetry: 1, RetryTimeout: 5};
     * @method System#loadStageFiles
     * @returns {Object} stage loader.
     * */
    system.loadStageFiles = function (stage, params = {}) {
        return fileLoader.loadStage(stage, params.forcedAssetsQuality
            || device.info().assetsQuality, bandwidth, params)
            .beforeLoad(function (file) {
                file.url = file.url + `?v=${config.version}`;
            });
    };
    /**
     * load files by stage forcing to take from CDN url
     * @example
     * const resources = await system.loadStageFilesFromCdn('preloader').start();
     * @param {String|Array} stage - A string or array representing the stage/stages name to load;
     * @param {Object} [params] - { MaxRetry: 1, RetryTimeout: 5};
     * @method System#loadStageFilesFromCdn
     * @returns {Object} stage loader.
     * */
    system.loadStageFilesFromCdn = function (stage, params) {
        return system.loadStageFiles(stage, params)
            .beforeLoad(system.hostedOnCdn);
    };
    /**
     * @method system#stageLoadEstimation
     * @param {string/array} stage - the name of the stage/an array of stages, to calculate the estimation
     * @param {Object} [options] - some options
     * @param {Array} options.assetsQualities - an array containing the qualities to evaluate
     * @returns {Array} an array containing { imageQuality, time, totalSize } for different combinations
     */
    system.stageLoadEstimation = function (stage, options = {}) {
        const imageQualities = options.assetsQualities || [device.info().assetsQuality];
        return imageQualities.map((assetsQuality) => {
            const totalSize = fileLoader.totalSize(stage, assetsQuality, bandwidth);
            const time = totalSize / bandwidth.value;
            return { assetsQuality, totalSize, time };
        });
    };
    /**
     * @method system#stageLoadAssetsQualityEstimation
     * @param {array} stage - an array with the stage names to evaluate
     * @param {array} array - for each quality the information in this format: { assetsQuality: 1, time: 10 }
     * @returns {object} a complex object with the information
     */
    system.stageLoadAssetsQualityEstimation = function (stage, array = []) {
        const assetsQualities = array.map(item => item.assetsQuality);
        const est = system.stageLoadEstimation(stage, { assetsQualities });
        return (est.find((item, index) => item.time <= array.find(it => it.assetsQuality === item.assetsQuality).time)
            || est[est.length - 1]).assetsQuality;
    };
    /**
     * retrieves detailed info of the files loading process
     * @method system#fileLoaderStats
     * @returns {Object} an object containing the statistics of the stages loaded
     */
    system.fileLoaderStats = () => fileLoader.stats();
    // *************************************************************************** STATS MANAGER
    /**
     * trace an event with the stats manager
     * @param {string} eventName - the name of the event to track
     * @param {object} params - the parameters to track for that event
     * @return {object} a promise when the trace has been performed
     */
    system.trace = (eventName, params) => statsManager.trace(eventName, params);
    // *************************************************************************** THREAD
    /**
     * creates a system thread
     * @method system#createThread
     * @param {Function} [callback] - () => {return { statements: { setUpEnvironment }, gos: {} }}
     * @returns {object} thread - an object with a private scope and methods to run UseCases, Components and Errors
     */
    system.createThread = (callback = () => Object.create({})) => {
        return Thread(system, callback);
    };
    // *************************************************************************** THREAD
    system.wait = wait;
    // *************************************************************************** LOCALISATION
    /**
     * load a system locale
     * @method system#locale
     * @param {String} file - the json file to load
     * @param {String} namespace - the namespace where the locales should be added
     * @returns {Object} system - a chain to the system
     */
    system.locale = (file, namespace) => {
        const localization = Localization(Object.assign({}, config, { deviceType: device.info().deviceType }));
        return localization.load(file, namespace);
    };
    // *************************************************************************** GLOBALIZATION
    system.toCurrency = (number) => {
        const string = parseFloat(number).toFixed(2);
        const integer = string.split('.')[0].split('').reverse().reduce((array, item, index) => {
            const number = Math.floor(index / 3);
            array[number] = array[number] || [];
            array[number].push(item)
            return array;
        }, []).map(a => a.reverse()).reverse().join('.').replace(/,/g, '');
        const decimals = string.split('.')[1];
        return `${integer},${decimals} €`
    };
    // *************************************************************************** PLUGINS
    const installed = {};
    system.install = function (array) {
        return new Promise(function (mainResolver) {
            Queue([
                () => system.loadStageFiles(array).start(),
                () => Promise.all([].concat(array).map(res => new Promise(resolve => {
                    if (installed[res]) {
                        resolve(installed[res]);
                    } else {
                        document.dispatchEvent(new CustomEvent(`execute-plugin-${res}`, {
                            detail: {
                                inject: (plugin) => {
                                    installed[res] = plugin({ system });
                                    resolve(installed[res]);
                                }
                            }
                        }))
                    }
                })))
            ]).play().then(() => {
                mainResolver(installed)
            })
        })
    };
    // *************************************************************************** VARIOUS
    /**
     * Apply a cache buster url param for "accesses" times
     * @method system#cacheBuster
     * @param {String} url - an url
     * @param {number} accesses - the times to apply the anti cache
     * @returns {String} the modified url
     */
    system.cacheBuster = function (url, { accesses }) {
        const date = Date.now();
        let cacheBuster = '';
        const count = storage.accessCounter();
        if (count > 1 && count <= accesses) {
            cacheBuster += `?cachebuster=${date}`;
        }
        return `${url}${cacheBuster}`;
    };
    /**
     * dispatch a 'appName' event on the document of the HTML
     * @example
     * system.launchApp('game');
     * document.addEventListener('game', (data) => {
     *      const thread = data.detail.start();
     *      const system = thread.system();
     * });
     * @method System#launchApp
     * @param {string} appName - the name of the app to launch
     * @returns {Object} chain to the System object.
     * */
    system.launchApp = function (appName) {
        document.dispatchEvent(new CustomEvent(appName, {
            detail: {
                start: (callback) => {
                    return system.createThread(callback);
                }
            }
        }));
        return system;
    };
    /**
     * return an integer representing the network calculated bandwidth expressed in byte/sec
     * @example
     * const bw = system.networkBandwidth();
     * @param {Object} [value] - an object with the props
     *              to extend { value: 10Bytes/sec, sampleSize: 100Bytes, evaluationMethod }
     * @method System#networkBandwidth
     * @returns {Object} containing this info { value, sampleSize, evaluationMethod }.
     * */
    system.networkBandwidth = function (value = {}) {
        simpleObjectExtend(bandwidth, value);
        return bandwidth;
    };
    /**
     * set the status of the system
     * @example
     * system.status(system.STATUS.READY);
     * @method System#status
     * @param {Integer} statusIndex - an integer (from System properties);
     * @param {object} [params] - some parameters used by the stats manager;
     * @returns {Object} chain to the System object.
     * */
    system.status = function (statusIndex, params = {}) {
        if (statusIndex === system.STATUS.READY) {
            DOM_LOADING = performance ? performance.timing.domLoading : (params.DOM_LOADING || DOM_LOADING);
        }
        statsManager.status({ DOM_LOADING, statusIndex, params });
        return system;
    };
    /**
     * return, inject an audio player
     * @example
     * const audioPlayer = system.audioPlayer();
     * system.audioPlayer({}); //inject
     * @param {Object} [player] - the audio player to inject;
     * @method System#audioPlayer
     * @returns {Object} a audio player.
     * */
    system.audioPlayer = function (player) {
        if (player) audioPlayer = player;
        return audioPlayer;
    };
    /**
     * return a middleware to apply before loading the stage files
     * @method system#hostedOnCdn
     * @param {Object} res - the resource
     * @param {Number} index - the index (referred to the its group) of the resource
     * @param {function} hostedOn - a function that apply the change of the host
     * @returns {any} the value of the hostedOn callback
     */
    system.hostedOnCdn = function (res, index, hostedOn) {
        return hostedOn(info.cdnHosts[index % info.cdnHosts.length]);
    };
    /**
     * @method system#accessCounter
     * @returns {number} the cookie based access count.
     */
    system.accessCounter = () => storage.accessCounter();
    system.resource = function (name, value) {
        if (value !== undefined) resources[name] = value;
        return resources[name];
    };
    system.log = e => e;
    system.cookies = cookies;
    // ***************************************************************************  LISTENERS
    window.addEventListener('load', () => {
        system.status(system.STATUS.CONTENT_LOADED);
    });

    return system;
}

System.setDocumentDomain = setDocumentDomain;

export default System;
