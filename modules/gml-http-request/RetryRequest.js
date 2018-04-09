import {HttpRequest} from './HttpRequest';

export function RetryRequest (url, options) {
    const httpRequest = HttpRequest(url, options);
    const obj = {};
    let timer;

    function retryPromise(method, data, beforeRetry) {
        const { retryTimeout = 1000, maxRetry = 0 } = options;
        return new Promise((resolve, reject) => {
            (function req(counter, privateData) {
                httpRequest.send(method, privateData)
                    .then(resolve)
                    .catch((error) => {
                        if (counter <= maxRetry) {
                            clearTimeout(timer);
                            timer = setTimeout(function () {
                                req(counter + 1, beforeRetry(privateData));
                            }, retryTimeout);
                        } else {
                            reject(error);
                        }
                    });
            }(1, data));
        });
    }

    obj.send = function (method, data, beforeRetry) {
        const callback = beforeRetry || (d => d);
        return retryPromise(method, data, callback);
    };
    obj.post = function (data) {
        return httpRequest.post(data);
    };
    obj.get = function () {
        return httpRequest.get();
    };
    obj.abort = function () {
        clearTimeout(timer);
        httpRequest.abort();
    };
    return obj;
}