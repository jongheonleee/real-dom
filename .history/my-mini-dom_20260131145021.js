// dom 직접 구현해보기 
// 객체 정의 
// - 1. EventTarget: 이벤트 시스템의 기반(가장 상위 클래스)
// - 2. Event: 이벤트 객체 
// - 3. Node: DOM 트리의 기본 단위
// - 4. Text: 텍스트 노드
// - 5. Element: HTML 요소 노드
// - 6. Document: 문서의 루트 노드

class EventTarget {

    constructor() {
        this._listeners = {};
    }

    addEventListener(type, listener, options = {}) {

        // 리스너 객체가 존재하지 않는 경우, 공간 할당 
        if (!this._listeners[type]) {
            this._listeners[type] = [];
        }

        // 옵션 처리
        const capture = typeof options === "boolean" ? options : options.capture || false;  
        const once = options.once || false;

        // 리스너 등록 
        this._listeners[type].push({
            listener, capture, once
        });

    }

    removeEventListener(type, listener, options = {}) {

    }

    dispatchEvent(event) {

        event._target = this;

        const path = [];
        let current = this;

        while (current) {
            path.unshift(current);
            current = current.parentNode;
        }

        event._phase = Event.CAPTURING_PHASE;
    }

    _invokeListeners(event, forCapture) {

    }

    _invokeListenersAtTarget(event) {

    }

    _executeListner(entry, event) {

    }

}


class Event {

    // 상수 정의 
    static NONE = 0;
    static CAPTURING_PHASE = 1;
    static AT_TARGET = 2;
    static BUBBLING_PHASE = 3;

    // 생성자 정의 
    constructor(type, options = {}) {

        // 인스턴스 변수 정의 
        this.type = type;
        this.bubbles = options.bubbles || false;
        this.cancelable = options.cancelable || false;
        this.timeStamp = Date.now();

        // 내부 상태 정의 
        this._target = null;
        this._currentTarget = null;
        this._phase = Event.NONE;
        this._propagationStopped = false;
        this._immediatePropagationStopped = false;
        this.defaultPrevented = false;

    }

    // 인스턴스 메서드 정의 
    get target() {
        return this._target;
    }

    get currentTarget() {
        return this._currentTarget;
    }

    get eventPhase() {
        return this._phase;
    }

    stopPropagation() {
        this._propagationStopped = true;
    }

    stopImmediatePropagation() {
        this._propagationStopped = true;
        this._immediatePropagationStopped = true;
    }

    preventDefault() {
        if (this.cancelable) {
            this.defaultPrevented = true;
        }
    }

}