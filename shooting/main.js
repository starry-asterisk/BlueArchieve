'use strict';
let worker;
var touchHistory = {};

const onloadEvent = () => {
    worker = new Worker('./shooting/worker.js?'+Math.random());
    let body = document.body;
    let canvas = document.querySelector('canvas');

    
    document.addEventListener('keydown', onKeyEvent('keydown'), false);
    document.addEventListener('keyup', onKeyEvent('keyup'), false);

    canvas.addEventListener("touchstart", onTouchEvent('touchstart'), { capture : false, passive : false });
    canvas.addEventListener("touchend", onTouchEvent('touchend'), false);
    canvas.addEventListener("touchcancel", onTouchEvent('touchcancel'), false);
    canvas.addEventListener("touchmove", onTouchEvent('touchmove'), false);

    const offscreen = canvas.transferControlToOffscreen();

    worker.postMessage({ type : 'init', canvas : offscreen}, [offscreen]);
};

const onTouchEvent = eventName => event => {
    let { before, x } = touchHistory;
    let { pageX } = event.changedTouches[0];
    if (eventName == 'touchmove' && before != 'touchend' && before != 'touchcancel' ) {
        worker.postMessage({ type : 'touchEvent', eventName : eventName, x : pageX - x });
    }

    if (eventName == 'touchstart') {
        event.preventDefault();
        worker.postMessage({ type : 'touchEvent', eventName : eventName });
    }

    if (eventName == 'touchend' || eventName == 'touchcancel') {
        worker.postMessage({ type : 'touchEvent', eventName : 'touchend'});
    }

    touchHistory = { before : eventName, x : pageX };
};

const onKeyEvent = eventName => event => {
    if(event.key == "Right" || event.key == "ArrowRight") {
        worker.postMessage({ type : 'keyDirect', eventName : eventName, key : 'right' });
    } else if(event.key == "Left" || event.key == "ArrowLeft") {
        worker.postMessage({ type : 'keyDirect', eventName : eventName, key : 'left' });
    } else if(event.key == 'W' || event.key == 'w') {
        worker.postMessage({ type : 'keyInput', eventName : eventName, key : 'w' });
    } else if(event.key == 'Enter') {
        console.log(eventName);
        worker.postMessage({ type : 'keyInput', eventName : eventName, key : 'enter' });
    }
};

const onunloadEvent = () => {
    if(typeof worker == 'object') worker.terminate();
};