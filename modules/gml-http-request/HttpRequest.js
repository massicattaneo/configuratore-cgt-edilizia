function getHttpObject() {
    /* istanbul ignore next */
    if (window.ActiveXObject) {
        return new window.ActiveXObject('MSXML2.XMLHTTP.3.0');
    }
    return new XMLHttpRequest();
}

export function HttpRequest (url, options = {}) {
    const obj = {};
    let aborted = null;
    let request;

    obj.send = function (method, data) {
        const { isAsync = true, timeout = 2000, headers = {} } = options;
        request = getHttpObject();
        aborted = false;
        request.open(method, url, isAsync);
        request.timeout = timeout;
        Object.keys(headers).forEach((key) => {
            request.setRequestHeader(key, headers[key]);
        });
        request.send(data);
        return new Promise((resolve, reject) => {
            request.onreadystatechange = () => {
                if (request.status === 200 && request.readyState === 4) {
                    resolve(request);
                } else if (aborted) {
                    /** aborted */
                } else if (request.status !== 200 && request.readyState === 4) {
                    /** error */
                    reject(request);
                }
            };
        });
    };

    obj.post = function (data) {
        return obj.send('POST', data);
    };

    obj.get = function () {
        return obj.send('GET');
    };

    obj.abort = function () {
        aborted = true;
        request.abort();
    };

    return obj;
}
