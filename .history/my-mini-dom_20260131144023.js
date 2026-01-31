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

    }

    _invokeListeners(event, forCapture) {

    }

    _invokeListenersAtTarget(event) {

    }

    _executeListner(entry, event) {
        
    }

}