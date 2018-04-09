import EventEmitter from '../../../gml-event-emitter/StreamEmitter';

export default function (system) {
    const em = EventEmitter();
    const router = {};
    router.emit = (...args) => {
        return em.emit(...args)
    };
    router.stream = (...args) => em.stream(...args);

    window.addEventListener('popstate', function (e) {
        router.emit(window.location.pathname, e.state) ;
    });

    return router;
}
