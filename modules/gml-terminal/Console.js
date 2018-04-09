function Console(onCommand) {
    const item = localStorage.getItem('console-history');
    const history = item ? item.split(',') : [];
    let historyPointer = -1;
    let containerDiv = null;
    let tabDiv = null;
    let logDiv = null;
    let inputDiv = null;
    let visible = true;     // flag for visibility
    let opened = false;     // flag for toggle on/off
    let enabled = true;     // does not accept log messages any more if it is false
    const logHeight = 215;    // 204 + 2*padding + border-top
    const tabHeight = 20;
    // for animation
    let animTime = 0;
    let animDuration = 200; // ms

    const getTime = function () {
        const now = new Date();
        let hour = '0' + now.getHours();
        hour = hour.substring(hour.length - 2);
        let minute = '0' + now.getMinutes();
        minute = minute.substring(minute.length - 2);
        let second = '0' + now.getSeconds();
        second = second.substring(second.length - 2);
        return hour + ':' + minute + ':' + second;
    };
    const getDate = function () {
        const now = new Date();
        let year = '' + now.getFullYear();
        let month = '0' + (now.getMonth() + 1);
        month = month.substring(month.length - 2);
        let date = '0' + now.getDate();
        date = date.substring(date.length - 2);
        return date + '-' + month + '-' + year;
    };
    const getRequestAnimationFrameFunction = function () {
        const requestAnimationFrame = window.requestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.webkitRequestAnimationFrame;
        if (requestAnimationFrame)
            return function (callback) {
                return requestAnimationFrame(callback);
            };
        else
            return function (callback) {
                return setTimeout(callback, 16);
            };
    };


    const obj = {
        ///////////////////////////////////////////////////////////////////////
        // create a div for log and attach it to document
        init: function () {
            // avoid redundant call
            if (containerDiv)
                return true;

            // check if DOM is ready
            if (!document || !document.createElement || !document.body || !document.body.appendChild)
                return false;

            // constants
            const CONTAINER_DIV = 'consoleContainer';
            const TAB_DIV = 'consoleTab';
            const LOG_DIV = 'console';
            const LOG_INPUT = 'consoleInput';
            const Z_INDEX = 9999;

            // create console DOM element
            containerDiv = document.getElementById(CONTAINER_DIV);
            if (!containerDiv) {
                // container
                containerDiv = document.createElement('div');
                containerDiv.id = CONTAINER_DIV;
                containerDiv.setAttribute('style', 'width:100%; ' +
                    'margin:0; ' +
                    'padding:0; ' +
                    'box-sizing:border-box; ' +
                    'position:fixed; ' +
                    'left:0; ' +
                    'z-index:' + Z_INDEX + '; ' +
                    'bottom:' + (-logHeight) + 'px; ');
                /* hide it initially */

                // tab
                tabDiv = document.createElement('div');
                tabDiv.id = TAB_DIV;
                tabDiv.appendChild(document.createTextNode('TERMINAL'));
                tabDiv.setAttribute('style', 'width:60px; ' +
                    'box-sizing:border-box; ' +
                    'overflow:hidden; ' +
                    'font:bold 10px verdana,helvetica,sans-serif; ' +
                    'line-height:' + (tabHeight - 1) + 'px; ' + /* subtract top-border */
                    'color:#fff; ' +
                    'position:absolute; ' +
                    'left:20px; ' +
                    'top:' + -tabHeight + 'px; ' +
                    'margin:0; padding:0; ' +
                    'text-align:center; ' +
                    'border:1px solid #aaa; ' +
                    'border-bottom:none; ' +
                    'user-select: none; ' +
                    /*'background:#333; ' + */
                    'background:rgba(0,0,0,0.8); ' +
                    '-webkit-border-top-right-radius:8px; ' +
                    '-webkit-border-top-left-radius:8px; ' +
                    '-khtml-border-radius-topright:8px; ' +
                    '-khtml-border-radius-topleft:8px; ' +
                    '-moz-border-radius-topright:8px; ' +
                    '-moz-border-radius-topleft:8px; ' +
                    'border-top-right-radius:8px; ' +
                    'border-top-left-radius:8px; ');
                // add mouse event handlers
                tabDiv.onmouseover = function () {
                    this.style.cursor = 'pointer';
                    this.style.textShadow = '0 0 1px #fff, 0 0 2px #0f0, 0 0 6px #0f0';
                };
                tabDiv.onmouseout = function () {
                    this.style.cursor = 'auto';
                    this.style.textShadow = 'none';
                };
                tabDiv.onclick = function () {
                    obj.toggle();
                };

                // log message
                logDiv = document.createElement('div');
                logDiv.id = LOG_DIV;
                logDiv.setAttribute('style', 'font:12px monospace; ' +
                    'height: ' + logHeight + 'px; ' +
                    'box-sizing:border-box; ' +
                    'color:#fff; ' +
                    'overflow-x:hidden; ' +
                    'overflow-y:scroll; ' +
                    'visibility:hidden; ' +
                    'position:relative; ' +
                    'bottom:0px; ' +
                    'margin:0px; ' +
                    'padding:5px; ' +
                    /*'background:#333; ' + */
                    'background:rgba(0, 0, 0, 0.8); ' +
                    'border-top:1px solid #aaa; ');

                inputDiv = document.createElement('input');
                inputDiv.id = LOG_INPUT;
                inputDiv.setAttribute('style', 'font:12px monospace; ' +
                    'height: auto' +
                    'box-sizing:border-box; ' +
                    'color:#fff; ' +
                    'overflow-x:hidden; ' +
                    'overflow-y:scroll; ' +
                    'position:relative; ' +
                    'bottom:0px; ' +
                    'margin:0px; ' +
                    'padding:5px; ' +
                    'width:100%; ' +
                    'background:rgba(0, 0, 0, 0.8); ' +
                    'border-top:1px solid #aaa; ');

                // style for log message
                const span = document.createElement('span');  // for coloring text
                span.style.color = '#afa';
                span.style.fontWeight = 'bold';

                // the first message in log
                const msg = '===== Terminal Started at ' +
                    getDate() + ', ' + getTime() + ' =====';

                span.appendChild(document.createTextNode(msg));
                logDiv.appendChild(span);
                logDiv.appendChild(document.createElement('br'));   // blank line
                logDiv.appendChild(document.createElement('br'));   // blank line

                inputDiv.addEventListener('keydown', function (e) {
                    e.stopPropagation();
                });

                inputDiv.addEventListener('keyup', function (e) {
                    e.stopPropagation();
                    switch (e.key) {
                    case 'Enter':
                        onCommand(inputDiv.value);
                        history.unshift(inputDiv.value);
                        localStorage.setItem('console-history', history);
                        inputDiv.value = '';
                        break;
                    case 'ArrowUp':
                        if (history[historyPointer + 1] !== undefined) {
                            inputDiv.value = history[++historyPointer];
                        }
                        break;
                    case 'ArrowDown':
                        if (history[historyPointer - 1] !== undefined) {
                            inputDiv.value = history[--historyPointer];
                        } else {
                            inputDiv.value = '';
                            historyPointer = -1;
                        }
                        break;
                    }
                });


                // add divs to document
                containerDiv.appendChild(tabDiv);
                containerDiv.appendChild(logDiv);
                containerDiv.appendChild(inputDiv);
                document.body.appendChild(containerDiv);

                if (localStorage.getItem('terminal_console_open') === 'true') {
                    obj.open();
                }
            }

            return true;
        },
        ///////////////////////////////////////////////////////////////////////
        // print log message to logDiv
        print: function (msg) {
            // ignore message if it is disabled
            if (!enabled)
                return;

            // check if this object is initialized
            if (!containerDiv) {
                const ready = this.init();
                if (!ready)
                    return;
            }

            let msgDefined = true;

            // convert non-string type to string
            if (typeof msg == 'undefined')   // print 'undefined' if param is not defined
            {
                msg = 'undefined';
                msgDefined = false;
            }
            else if (msg === null)           // print 'null' if param has null value
            {
                msg = 'null';
                msgDefined = false;
            }
            else {
                try {
                    msg = JSON.stringify(msg); // for 'object', 'function', 'boolean', 'number' types
                } catch(e) {
                    msg = msg.toString();
                }
            }

            const lines = msg.split(/\r\n|\r|\n/);
            for (const i in lines) {
                // format time and put the text node to inline element
                const timeDiv = document.createElement('div');            // color for time
                timeDiv.setAttribute('style', 'color:#999;' +
                    'float:left;');

                const timeNode = document.createTextNode(getTime() + '\u00a0');
                timeDiv.appendChild(timeNode);

                // create message span
                const msgDiv = document.createElement('div');
                msgDiv.setAttribute('style', 'word-wrap:break-word;' +  // wrap msg
                    'margin-left:6.0em;');     // margin-left = 9 * ?
                if (!msgDefined)
                    msgDiv.style.color = '#afa'; // override color if msg is not defined

                // put message into a text node
                const line = lines[i].replace(/ /g, '\u00a0');
                const msgNode = document.createTextNode(line);
                msgDiv.appendChild(msgNode);

                // new line div with clearing css float property
                const newLineDiv = document.createElement('div');
                newLineDiv.setAttribute('style', 'clear:both;');

                logDiv.appendChild(timeDiv);            // add time
                logDiv.appendChild(msgDiv);             // add message
                logDiv.appendChild(newLineDiv);         // add message

                logDiv.scrollTop = logDiv.scrollHeight; // scroll to last line
            }
        },
        ///////////////////////////////////////////////////////////////////////
        // slide log container up and down
        toggle: function () {
            if (opened)  // if opened, close the window
                this.close();
            else        // if closed, open the window
                this.open();
        },
        open: function () {
            if (!this.init()) return;
            if (!visible) return;
            if (opened) return;

            logDiv.style.visibility = 'visible';
            animTime = Date.now();
            const requestAnimationFrame = getRequestAnimationFrameFunction();
            function slideUp() {
                const duration = Date.now() - animTime;
                if (duration >= animDuration) {
                    containerDiv.style.bottom = 0;
                    opened = true;
                    return;
                }
                const y = Math.round(-logHeight * (1 - 0.5 * (1 - Math.cos(Math.PI * duration / animDuration))));
                containerDiv.style.bottom = '' + y + 'px';
                requestAnimationFrame(slideUp);
            }
            requestAnimationFrame(slideUp);
            localStorage.setItem('terminal_console_open', true);
        },
        close: function () {
            if (!this.init()) return;
            if (!visible) return;
            if (!opened) return;

            animTime = Date.now();
            const requestAnimationFrame = getRequestAnimationFrameFunction();
            function slideDown() {
                const duration = Date.now() - animTime;
                if (duration >= animDuration) {
                    containerDiv.style.bottom = '' + -logHeight + 'px';
                    logDiv.style.visibility = 'hidden';
                    opened = false;
                    return;
                }
                const y = Math.round(-logHeight * 0.5 * (1 - Math.cos(Math.PI * duration / animDuration)));
                containerDiv.style.bottom = '' + y + 'px';
                requestAnimationFrame(slideDown);
            }
            requestAnimationFrame(slideDown);
            localStorage.setItem('terminal_console_open', false);
        },
        ///////////////////////////////////////////////////////////////////////
        // show/hide the console window and tab
        show: function () {
            if (!this.init())
                return;

            containerDiv.style.display = 'block';
            visible = true;
        },
        hide: function () {
            if (!this.init())
                return;

            containerDiv.style.display = 'none';
            visible = false;
        },
        ///////////////////////////////////////////////////////////////////////
        // when Logger is enabled (default), log() method will write its message
        // to the console ('logDiv')
        enable: function () {
            if (!this.init())
                return;

            enabled = true;
            tabDiv.style.color = '#fff';
            logDiv.style.color = '#fff';
        },
        ///////////////////////////////////////////////////////////////////////
        // when it is diabled, subsequent log() calls will be ignored and
        // the message won't be written on 'logDiv'.
        // 'LOG' tab and log text are grayed out to indicate it is disabled.
        disable: function () {
            if (!this.init())
                return;

            enabled = false;
            tabDiv.style.color = '#444';
            logDiv.style.color = '#444';
        },
        ///////////////////////////////////////////////////////////////////////
        // clear all messages from logDiv
        clear: function () {
            if (!this.init())
                return;

            logDiv.innerHTML = '';
        }
    };
    return obj;
};

module.exports = Console;
