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

        if (!this._listeners[type]) return;

        const capture = typeof options === "boolean" ? options : options.capture || false;

        this._listeners[type] = this._listeners[type].filter(
            entry => !(entry.listener === listener && entry.capture === capture)
        );

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
        for (let i=0; i<path.length-1; i++) {
            if (event._propagationStopped) break;

            event._currentTarget = path[i];
            path[i]._invokeListeners(event, true);
        }

        if (!event._propagationStopped) {

            event._phase = Event.AT_TARGET;
            event._currentTarget = this;
            this._invokeListenersAtTarget(event);

        }

        if (!event._propagationStopped && event.bubbles) {
            event._phase = Event.BUBBLING_PHASE;

            for (let i=path.length-2; i>=0; i--) {
                if (event._propagationStopped) break;
                event._currentTarget = path[i];
                path[i]._invokeListeners(event, false);
            }
        }

        return !event.defaultPrevented;
    }

    _invokeListeners(event, forCapture) {
        const listeners = this._listeners[event.type];

        if (!listeners) return;

        for (const entry of [...listeners]) {
            if (entry.capture !== forCapture) continue;
            this._executeListner(entry, event);
            if (event._immediatePropagationStopped) break;
        }
    }

    _invokeListenersAtTarget(event) {

        const listeners = this._listeners[event.type];

        if (!listeners) return;

        for (const entry of [...listeners]) {
            this._executeListner(entry, event);

            if (event._immediatePropagationStopped) break;

        }

    }

    _executeListner(entry, event) {

        if (entry.once) {
            this.removeEventListener(event.type, entry.listener, { capture: entry.capture});
        }

        try {
            entry.listener.call(this, event);
        } catch (e) {
            console.error('Error in event listener:', e);
        }

    }

}

class Event{

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

class Node extends EventTarget {

    // 노드 타입 상수 정의 
    static ELEMENT_NODE = 1;
    static TEXT_NODE = 3;
    static COMMENT_NODE = 8;
    static DOCUMENT_NODE = 9;

    // 생성자 정의 
    constructor(nodeType) {
        super();

        this.nodeType = nodeType;
        this.parentNode = null;
        this.childNodes = [];
    }

    // 인스턴스 메서드 정의 
    get firstChild() {
        return this.childNodes[0] || null;
    }   

    get lastChild() {
        return this.childNodes[this.childNodes.length - 1] || null;
    }

    get nextSibling() {

        if (!this.parentNode) return null;

        const siblings = this.parentNode.childNodes;
        const index = siblings.indexOf(this);

        return siblings[index + 1] || null;
    }

    get previousSibling() {
        if (!this.parentNode) return null;

        const siblings = this.parentNode.childNodes;
        const index = siblings.indexOf(this);
        
        return siblings[index - 1] || null;
    }

    get textContent() {
        return this.childNodes.map(child => child.textContent)
                              .join("");
    }

    set textContent(value) {

        while (this.firstChild) {
            this.removeChild(this.firstChild);
        }

        if (value) {
            this.appendChild(new Text(value));
        }
    }

    appendChild(child) {
        if (child.parentNode) {
            child.parentNode.removeChild(child);
        }

        child.parentNode = this;

        this.childNodes.push(child);

        return child;
    }

    insertBefore(newNode, referenceNode) {

        if (!referenceNode) {
            return this.appendChild(newNode);
        }

        const index = this.childNodes.indexOf(referenceNode);
        if (index === -1) {
            throw new Error("Reference node not found");
        }

        if (newNode.parentNode) {
            newNode.parentNode.removeChild(newNode);
        }

        newNode.parentNode = this;
        this.childNodes.splice(index, 0, newNode);

        return newNode;
    }

    removeChild(child) {
        const index = this.childNodes.indexOf(child);

        if (index === -1) {
            throw new Error("Node not found");
        }

        child.parentNode = null;
        this.childNodes.splice(index, 1);

        return child;
    }

    replaceChild(newChild, oldChild) {
        const index = this.childNodes.indexOf(oldChild);

        if (index === -1) {
            throw new Error("Node not Found");
        }

        if (newChild.parentNode) {
            newChild.parentNode.removeChild(newChild);
        }

        oldChild.parentNode = null;
        newChild.parentNode = this;
        this.childNodes[index] = newChild;

        return oldChild;
    }

    cloneNode(deep = false) {
        const clone = new this.constructor();

        if (deep) {
            for (const child of this.childNodes) {
                clone.appendChild(child.cloneNode(true));
            }
        }

        return clone;
    }

    contains(node) {
        if (node === this) return true;

        for (const child of this.childNodes) {
            if (child.contains(node)) return true;
        }

        return false; 
    }

}

class Text extends Node {

    constructor(data = '') {
        super(Node.TEXT_NODE);
        this.data = data;
        this.nodeName = "#text";
    }

    get textContent() {
        return this.data;
    }

    set textContent(value) {
        this.data = value;
    }

    get nodeValue() {
        return this.data;
    }

    set nodeValue(value) {
        this.data = value;
    }

    cloneNode() {
        return new Text(this.data);
    }

}

class Element extends Node {

    constructor(tagName) {
        super(Node.ELEMENT_NODE);

        this.tagName = tagName.toUpperCase();
        this.nodeName = this.tagName;
        this.attributes = new Map();
        this.id = "";
        this.className = "";

    }

    getAttribute(name) {
        if (name === "id") return this.id;

        if (name === "class") return this.className;

        return this.attributes.get(name) || null;
    }

    setAttribute(name, value) {
        if (name === "id") {
            this.id = value;
        } else if (name === "class") {
            this.className = value;
        }

        this.attributes.set(name, value);
    }

    removeAttribute(name) {
        if (name === "id") this.id = "";
        if (name === "class") this.className = "";
        this.attributes.delete(name);
    }

    hasAttribute(name) {
        return this.attributes.has(name);
    }

    get classList() {
        const self = this;

        return {
            _classes: () => self.className.split(/\s+/).filter(Boolean),

            add(...classes) {
                const current = new Set(this._classes());

                classes.forEach(c => current.add(c));

                self.className = [...current].join(" ");
            },

            remove(...classes) {
                const current = new Set(this._classes());

                claases.forEach(c => current.delete(c));

                self.className = [...current].join(" ");
            },

            toggle(className) {
                if (this.contains(className)) {
                    this.remove(className);
                    return false;
                } else {
                    this.add(className);
                    return true;
                }
            },

            contains(className) {
                return this._classes().includes(className);
            }
        };
    }

    get children() {
        return this.childNodes.filter(n => n.nodeType === Node.ELEMENT_NODE);
    }

    get firstElementChild() {
        return this.children[0] || null;
    }

    get lastElementChild() {
        const children = this.children;
        return children[children.length - 1] || null;
    }

    get innerHTML() {
        return this.childNodes.map(child => {
            if (child instanceof Text) {
                return child.data;
            }

            if (child instanceof Element) {
                return child.outerHTML;
            }

            return "";
        }).join("");
    }

    set innerHTML(html) {
        while (this.firstChild) {
            this.removeChild(this.firstChild);
        }

        if (html) {
            this.appendChild(new Text(html));
        }
    }

    get outerHTML() {
        const attrs = [];

        for (const [key, value] of this.attributes) {
            attrs.push(`${key}="${value}`);
        }

        const attrStr = attrs.length ? " " + attrs.join(" ") : " ";
        const tag = this.tagName.toLowerCase();

        const voidElements = ["br", "hr", "img", "input", "meta", "link"];
        if (voidElements.includes(tag)) {
            return `<${tag}${attrStr}>`;
        }

        return `<${tag}${attrStr}>${this.innerHTML}</${tag}>`;
    }

    querySelector(selector) {
        return this._querySelectorAll(selector)[0] || null;
    }

    querySelectorAll(selector) {
        return this._querySelectorAll(selector);
    }

    _querySelectorAll(selector) {
        const results = [];

        const matchFn = this._createMatcher(selector);

        const traverse = (node) => {

            for (const child of node.childNodes) {
                if (child instanceof Element) {
                    if (matchFn(child)) {
                        results.push(child);
                    }
                    traverse(child);
                }
            }
        }
        traverse(this);
        return results;
    }

    _createMatcher(selector) {
        if (selector.startsWith("#")) {
            const id = selector.slice(1);
            return (el) => el.id === id;
        }

        if (selector.startsWith(".")) {
            const className = selector.slice(1);
            return (el) => el.classList.contains(className);
        }

        const tagName = selector.toUpperCase();
        return (el) => el.tagName === tagName;
    }

    closeset(selector) {
        let current = this;
        const matchFn = this._createMatcher(selector);

        while (current) {
            if (current instanceof Element && matchFn(current)) {
                return current;
            }

            current = current.parentNode;
        }

        return null;
    }

    cloneNode(deep = false) {
        const clone = new Element(this.tagName);

        for (const [key, value] of this.attributes) {
            clone.setAttributeNS(key, value);
        }

        if (deep) {
            for (const child of this.childNodes) {
                clone.appendChild(child.cloneNode(true));
            }
        }

        return clone;
    }
}

class Document extends Node {

    constructor() {
        super(Node.DOCUMENT_NODE);
        this.nodeName = "#document";

        this.documentElement = null;
    }

    createElement(tagName) {
        return new Element(tagName);
    }

    createTextNode(data) {
        return new Text(data);
    }

    getElementById(id) {
        const search = (node) => {
            for (const child of node.childNodes) {
                if (child instanceof Element) {

                    if (child.id === id) return child;
                    const found = search(child);
                    if (found) return found;

                }

            }
        }

        return search(this);
    }

    getElementsByTagName(tagName) {
        const results = [];
        const targetTag = tagName.toUpperCase();

        const search = (node) => {

            for (const child of node.childNodes) {
                if (child instanceof Element) {
                    if (tagName === "*" || child.tagName === targetTag) {
                        results.push(child);
                    }

                    search(child);
                }
            }
        }

        search(this);
        return results;
    }

    getElementsByClassName(className) {
        const results = [];

        const search = (node) => {
            for (const child of node.childNodes) {

                if (child instanceof Element) {
                    if (child.classList.contains(className)) {
                        results.push(child);
                    }

                    search(child);
                }
            }
        };

        search(this);
        return results;
    }

    querySelector(selector) {
        if (this.documentElement) {

            const matchFn = this.documentElement._createMatcher(selector);

            if (matchFn(this.documentElement)) {
                return this.documentElement;
            }

            return this.documentElement.querySelector(selector);
        }

        return null;
    }

    querySelectorAll(selector) {
        if (this.documentElement) {
            const matchFn = this.documentElement._createMatcher(selector);
            const results = [];

            if (matchFn(this.documentElement)) {
                results.push(this.documentElement);
            }

            return results.concat(this.documentElement.querySelectorAll(selector));
        }

        return [];
    }
}