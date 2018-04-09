export default function () {
    const router = {};
    const routes = [];
    let mode = null;
    let root = '/';

    router.config = function (options) {
        mode = options && options.mode && options.mode === 'history'
        && !!(history.pushState) ? 'history' : 'hash';
        root = options && options.root ? '/' + router.clearSlashes(options.root) + '/' : '/';
        return router;
    };

    router.getFragment = function () {
        let fragment = '';
        if (mode === 'history') {
            fragment = router.clearSlashes(decodeURI(location.pathname + location.search));
            fragment = fragment.replace(/\?(.*)$/, '');
            fragment = root != '/' ? fragment.replace(root, '') : fragment;
        } else {
            const match = window.location.href.match(/#(.*)$/);
            fragment = match ? match[1] : '';
        }
        return router.clearSlashes(fragment);
    };

    router.clearSlashes = function (path) {
        return path.toString().replace(/\/$/, '').replace(/^\//, '');
    };

    router.add = function (url, handler) {
        routes.push({ url, handler });
        return router;
    };

    router.empty = function () {
        routes.length = 0;
        return router;
    };

    router.navigate = function (path) {
        path = path ? path : '';
        if (mode === 'history') {
            history.pushState(null, null, root + router.clearSlashes(path));
        } else {
            window.location.href = window.location.href.replace(/#(.*)$/, '') + '#' + path;
        }
        return router;
    };

    window.addEventListener('popstate', function () {
        router.navigate(router.getFragment() + '/');
    });


    // router
    //     .add(/about/, function() {
    //         console.log('about');
    //     })
    //     .add(/products\/(.*)\/edit\/(.*)/, function() {
    //         console.log('products', arguments);
    //     })
    //     .add(function() {
    //         console.log('default');
    //     })
    //     .check('/products/12/edit/22');

    return router;
}