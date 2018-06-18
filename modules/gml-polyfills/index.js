import './String'
import './Date'
import './Table';
import './EventEmitter';
import './Promise';
import './Store';
import './Function';
import './HTMLElement';
import {RetryRequest} from "../gml-http-request";

window.RetryRequest = RetryRequest;
// const remove = HTMLElement.prototype.addEventListener
//     .bind(document.getElementById('system'))
//     .partial('click')
//     .debounce(1000)
//     .subscribe(i => console.log(i));


// const remove = HTMLElement.prototype.addEventListener
//     .bind(document.getElementById('system'))
//     .partial('click')
//     .map(event => {
//         return function (fn) {
//             fn && fn(event);
//             return new Promise(function (res) {
//                 setTimeout(() => res(event), 1000)
//             })
//         }
//     })
//     .queue()
//     .subscribe(function (cb) {
//         return cb(function (e) {
//             console.log(e)
//         })
//     });

// Array.prototype
//     .forEach
//     .bind([0, 1, 2, 3])
//     .filter(i => i!==2)
//     .stack()
//     .subscribe(function (item, next) {
//         console.log(item)
//         setTimeout(next, 1000)
//     });

// window.rx = {x: 1, y: 1}.reactive();
// window.rem = Object.prototype.connect
//     .bind(rx)
//     .map(i => i.x + i.y)
//     .filter(sum => sum > 10)
//     .subscribe(function (sum) {
//         console.log(sum)
//     })

// window.em = EventEmitter();
// em.all
//     .filter(e => e === 'click')
//     .subscribe((event, param) => {
//         console.log(event, param)
//         return new Promise(function (resolve) {
//             setTimeout(() => resolve(event), 1000)
//         });
//     })

// window.em = EventEmitter();
// em.on
//     .partial('click')
//     .map(v => Math.pow(v, 2))
//     .subscribe(function (value) {
//         console.log(value);
//         return 'sub-1';
//     });
//
// em.all
//     .subscribe(function (value) {
//         console.log(value);
//         return 'sub-2';
//     });

// window.store1 = ({ array: [], name: 'store1' }).reactive();
// window.store2 = ({ array: [], name: 'store2' }).reactive();
// ({ array1: () => store1.array, array2: () => store2.array })
//     .reactive()
//     .connect(function ({ array1, array2 }) {
//         console.log('hola1', array1.length, array2.length)
//     });
//
// ({ array1: () => store1.array, array2: () => store2.array })
//     .reactive()
//     .connect(function ({ array1, array2 }) {
//         console.log('hola2', array1.length, array2.length)
//     });