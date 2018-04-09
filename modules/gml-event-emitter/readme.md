GML EVENT EMITTER
=====================

**A small implementation of an event emitter**

How to use it:

```
import EventEmitter from 'gml-event-emitter';
const em = EventEmitter();

const remove = em.on('event', params => console.log(params));
em.emit('event', 'fired!');
//log: 'fired!'
remove();
em.emit('event', 'not fired!');
//log nothing


import EventEmitter from 'gml-event-emitter/StreamEmitter';
const sm = EventEmitter();
//with streams
const stream = sm.stream({evenMoreParams: 2})
    .filter((event, params) => params.id === 1)
    .subscribe((event, params, extraParams) => new Promise((res) => {
        console.log(params.id, extraParams.evenMoreParams)
        setTimeout(res, 1000);
    });
        
sm
    .emit('whatever you want', {id: 1})
    .then(() => console.log('finish'));
//log: 1,2
// wait 1 second
//log: 'finish'

```
