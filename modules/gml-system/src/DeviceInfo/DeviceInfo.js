import simpleObjectExtend from '../utils/simpleObjectExtend';
import EventEmitter from '../../../gml-event-emitter/StreamEmitter';
import compMatrix from './compatibilityMatrix.json';

function calculateBrowserVersion(fullVersion, subVersion) {
    subVersion = subVersion || false;
    var integer = fullVersion ? fullVersion.split('.') : ['0'];
    return subVersion ? integer[0] + '.' + integer[1] : integer[0];
}

function getBrowserInfo(ua) {
    if (ua.match(/(OPR)[^\d]\d*.\d*/)) {
        return ['', 'opera', ua.match(/OPR[^\d](\d*.\d*)/)[1]]
    }
    else if (ua.match(/(Chrome)\/(\d*\.\d*)/)) {
        if (/SamsungBrowser\/(\d*\.\d*)/.test(ua)) {
            return ['', 'embedded', ua.match(/SamsungBrowser\/(\d*\.\d*)/)[1]];
        }
        if (/Version\/(\d*\.\d*)/.test(ua)) {
            return ['', 'embedded', ua.match(/Version\/(\d*\.\d*)/)[1]];
        }
        return (ua.match(/(Chrome)\/(\d*\.\d*)/));
    }
    else if (ua.match(/(Firefox)\/(\d*\.\d*)/)) {
        return (ua.match(/(Firefox)\/(\d*\.\d*)/));
    }
    else if (ua.match(/(ucbrowser(?=\/))\/?\s*([\d\.]+)/i)) {
        const newVar = ['', '', ''];
        if ((/U3\//.test(ua) || /U2\//.test(ua)) && /iPhone|iPad/i.test(ua)) {
            newVar[1] = 'UCHD';
        } else {
            newVar[1] = 'UC';
        }
        var version = ua.match(/(?:ucbrowser\/)([\d\.]+)/i);
        newVar[2] = calculateBrowserVersion(version[1], 1);
        return newVar;
    }
    else if (ua.match(/(CriOS)\/(\d*\.\d*)/)) {
        let myNewVar = (ua.match(/(CriOS)\/(\d*\.\d*)/));
        myNewVar[1] = 'chrome';
        return myNewVar;
    }
    else if (ua.match(/(Safari)\/(\d*\.\d*)/)) {
        let myNewVar = (ua.match(/(Version)\/(\d*\.\d*)/));
        myNewVar[1] = 'Safari';
        return myNewVar;
    } else if (ua.match(/Trident\/(\d)/)) {
        var match = Number(ua.match(/Trident\/(\d)/)[1]) + 4;
        return ['', 'IE', match.toString()];
    }
    return ['', 'unknown', 'unknown'];
}

function getOsInfo(ua) {
    var ret = ['unknown', -1];
    if (ua.match(/WOW64/)) {
        ret[0] = 'windows';
        if (ua.match(/Windows NT 6/)) {
            ret[1] = 7;
        }
    } else if (ua.indexOf('Android ') > 0) {
        ret[0] = 'Android';
        ret[1] = ua.substr(ua.indexOf('Android ') + 8, 3);
    } else if (/iPhone|iPad/i.test(ua)) {
        ret[0] = 'iOS';
        ret[1] = ua.match(/OS (\d*[^\d]\d*)/)[1].replace('_', '.');
    } else if (ua.match(/Macintosh/)) {
        ret[0] = 'OSX';
        ret[1] = ua.match(/Mac OS X (\d*[^\d]\d*)/)[1].replace('_', '.');
    } else if (ua.match(/Linux/)) {
        ret = ['Linux', -1];
    }
    return ret;
}

function getDeviceType(ua) {
    if (!/(Mobi|iPad|Tablet|Android)/i.test(ua) && (/Linux/.test(ua) || /Windows/.test(ua) || /Macintosh/.test(ua))) {
        return 'desktop';
    } else if (ua.indexOf('Android ') > 0) {
        return (/Mobile/i.test(ua)) ? 'mobile' : 'tablet';
    } else if (/iPhone|iPad/i.test(ua)) {
        return (/iPhone/i.test(ua)) ? 'mobile' : 'tablet';
    }
    return 'unknown';
}

function getWindowInfo() {
    return {
        width: Math.max(document.documentElement.clientWidth, window.innerWidth),
        height: Math.max(document.documentElement.clientHeight, window.innerHeight)
    };
}

export default function ({ ua, assetsQuality, throwError }) {
    const em = EventEmitter('device-info');
    const privateInfo = ({
        deviceType: 'unknown',
        os: 'unknown',
        osVersion: -1,
        browserName: 'unknown',
        browserVersion: -1,
        assetsQuality: assetsQuality || 0,
        maximumAssetsQuality: 1,
        bgMusicQuality: 1,
        resolution: 1,
        width: getWindowInfo().width,
        height: getWindowInfo().height,
        forceCanvas: false,
        orientation: 'landscape'
    }).reactive();
    try {
        const osInfo = getOsInfo(ua);
        const browserInfo = getBrowserInfo(ua);
        privateInfo.deviceType = getDeviceType(ua);
        privateInfo.os = osInfo[0].toLowerCase();
        privateInfo.osVersion = Number(osInfo[1]);
        privateInfo.browserName = browserInfo[1].toLowerCase();
        privateInfo.browserVersion = Number(browserInfo[2]);
    } catch (error) {
        throwError({ type: 'DEVICE INFO SETUP', subType: error, description: ua });
    }
    const obj = {};

    function testUserAgent(deviceName) {
        return RegExp(deviceName).test(ua);
    }

    function getIExtendedInfo() {
        const opts = { testUserAgent };
        simpleObjectExtend(opts, privateInfo);
        return opts;
    }

    obj.setMaximumAssetsQuality = function (quality, callback = e => true) {
        if (callback(getIExtendedInfo())) {
            privateInfo.maximumAssetsQuality = quality;
        }
    };
    obj.setAssetsQuality = function (quality, callback = e => true) {
        if (callback(getIExtendedInfo())) {
            privateInfo.assetsQuality = quality;
        }
    };
    obj.setResolution = function (resolution, callback = e => true) {
        if (callback(getIExtendedInfo())) {
            privateInfo.resolution = resolution;
        }
    };
    obj.setBgMusicQuality = function (quality, callback = e => true) {
        if (callback(getIExtendedInfo())) {
            privateInfo.bgMusicQuality = quality;
        }
    };
    obj.info = function () {
        return privateInfo;
    };
    obj.testUserAgent = function (regEx) {
        return testUserAgent(regEx);
    };
    obj.onChange = function () {
        return em.stream();
    };
    obj.isCompatible = function (force) {
        let ret;
        try {
            ret = !!(compMatrix[privateInfo.deviceType] &&
                compMatrix[privateInfo.deviceType][privateInfo.os] &&
                privateInfo.osVersion >= compMatrix[privateInfo.deviceType][privateInfo.os].version &&
                compMatrix[privateInfo.deviceType][privateInfo.os].browsers[privateInfo.browserName] &&
                privateInfo.browserVersion >=
                compMatrix[privateInfo.deviceType][privateInfo.os].browsers[privateInfo.browserName]);
        } catch (e) {
            throwError({
                type: 'COMPATIBILITY MATRIX',
                subType: 'ERROR',
                description: `USER AGENT: ${ua}`
            });
        } finally {
            ret = force === undefined ? ret : force;
            if (ret === false) {
                throwError({
                    type: 'BROWSER_UNSUPPORTED',
                    subType: 'COMPATIBILITY MATRIX',
                    description: 'ua'
                });
            }
            ret = (ret === undefined) ? false : ret;
        }
        return ret;
    };

    const resize = function () {
        privateInfo.width = getWindowInfo().width;
        privateInfo.height = getWindowInfo().height;
        privateInfo.orientation = privateInfo.width >= privateInfo.height ? 'landscape' : 'portrait';
        em.emit('window-resize', privateInfo);
    };
    window.addEventListener('resize', resize, false);
    obj.resize = resize;
    resize();

    return obj;
}
