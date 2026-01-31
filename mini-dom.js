/**
 * Mini DOM Implementation
 * DOM의 동작 원리를 이해하기 위한 간소화된 구현
 *
 * 실제 DOM 상속 계층:
 * EventTarget → Node → Element → HTMLElement → HTMLDivElement, ...
 *                    → Text
 *                    → Document
 */

// ============================================================
// 1. EventTarget - 이벤트 시스템의 기반 (가장 상위 클래스)
// ============================================================
class EventTarget {
  constructor() {
    // 이벤트 리스너 저장소: { eventType: [{ listener, options }] }
    this._listeners = {};
  }

  /**
   * 이벤트 리스너 등록
   * @param {string} type - 이벤트 타입 (click, input 등)
   * @param {Function} listener - 콜백 함수
   * @param {Object|boolean} options - capture 여부 등
   */
  addEventListener(type, listener, options = {}) {
    
    // 리스너 객체가 존재하지 않는 경우, 초기화 
    if (!this._listeners[type]) {
      this._listeners[type] = [];
    }

    // 옵션 처리
    const capture = typeof options === 'boolean' ? options : options.capture || false;
    const once = options.once || false;

    // 리스너 등록 
    this._listeners[type].push({ listener, capture, once });
  
  }

  removeEventListener(type, listener, options = {}) {
    
    // 해당 타입의 리스너가 없으면 종료
    if (!this._listeners[type]) return;

    // 옵션 처리
    const capture = typeof options === 'boolean' ? options : options.capture || false;

    // 리스너 제거
    this._listeners[type] = this._listeners[type].filter(
      entry => !(entry.listener === listener && entry.capture === capture)
    );
  }

  /**
   * 이벤트 디스패치 - DOM 이벤트의 3단계 전파 구현
   * 1. Capturing Phase: window → target (위에서 아래로)
   * 2. Target Phase: target 자신
   * 3. Bubbling Phase: target → window (아래에서 위로)
   */
  dispatchEvent(event) {

    // 이벤트에 target 설정
    event._target = this;

    // 조상 노드 경로 수집 (capturing/bubbling에 사용)
    const path = [];
    let current = this;

    while (current) {
      path.unshift(current);  // [root, ..., parent, this]
      current = current.parentNode;
    }

    // Phase 1: CAPTURING_PHASE (root → target 직전까지)
    event._phase = Event.CAPTURING_PHASE;
    for (let i = 0; i < path.length - 1; i++) {
      if (event._propagationStopped) break;

      event._currentTarget = path[i];
      path[i]._invokeListeners(event, true);  // capture=true인 리스너만
    }

    // Phase 2: AT_TARGET (등록 순서대로 모든 리스너 실행)
    if (!event._propagationStopped) {

      event._phase = Event.AT_TARGET;
      event._currentTarget = this;
      this._invokeListenersAtTarget(event);

    }

    // Phase 3: BUBBLING_PHASE (target 다음 → root)
    if (!event._propagationStopped && event.bubbles) {
      event._phase = Event.BUBBLING_PHASE;

      for (let i = path.length - 2; i >= 0; i--) {
        if (event._propagationStopped) break;
        event._currentTarget = path[i];
        path[i]._invokeListeners(event, false);  // capture=false인 리스너만
      }

    }

    return !event.defaultPrevented;
  }

  /**
   * 내부 메서드: 해당 노드의 리스너 실행 (Capturing/Bubbling용)
   */
  _invokeListeners(event, forCapture) {

    const listeners = this._listeners[event.type];

    if (!listeners) return;

    for (const entry of [...listeners]) {
      if (entry.capture !== forCapture) continue;
      this._executeListener(entry, event);
      if (event._immediatePropagationStopped) break;
    }

  }

  /**
   * AT_TARGET 단계용: 등록 순서대로 모든 리스너 실행
   */
  _invokeListenersAtTarget(event) {

    const listeners = this._listeners[event.type];
    
    if (!listeners) return;

    for (const entry of [...listeners]) {
      this._executeListener(entry, event);
      if (event._immediatePropagationStopped) break;
    }

  }

  _executeListener(entry, event) {
    
    if (entry.once) {
      this.removeEventListener(event.type, entry.listener, { capture: entry.capture });
    }
    
    try {
      entry.listener.call(this, event);
    } catch (e) {
      console.error('Error in event listener:', e);
    }
  }
}


// ============================================================
// 2. Event - 이벤트 객체
// ============================================================
class Event {
  static NONE = 0;
  static CAPTURING_PHASE = 1;
  static AT_TARGET = 2;
  static BUBBLING_PHASE = 3;

  constructor(type, options = {}) {
    this.type = type;
    this.bubbles = options.bubbles || false;
    this.cancelable = options.cancelable || false;
    this.timeStamp = Date.now();

    // 내부 상태
    this._target = null;
    this._currentTarget = null;
    this._phase = Event.NONE;
    this._propagationStopped = false;
    this._immediatePropagationStopped = false;
    this.defaultPrevented = false;
  }

  get target() { return this._target; }
  get currentTarget() { return this._currentTarget; }
  get eventPhase() { return this._phase; }

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


// ============================================================
// 3. Node - DOM 트리 구조의 핵심 (EventTarget 상속)
// ============================================================
class Node extends EventTarget {
  // 노드 타입 상수
  static ELEMENT_NODE = 1;
  static TEXT_NODE = 3;
  static COMMENT_NODE = 8;
  static DOCUMENT_NODE = 9;

  constructor(nodeType) {
    super();  // EventTarget 초기화

    this.nodeType = nodeType;
    this.parentNode = null;
    this.childNodes = [];  // 자식 노드 배열 (실제론 NodeList)
  }

  // 읽기 전용 프로퍼티들 (getter)
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
    // 모든 자손 Text 노드의 내용을 합침
    return this.childNodes
      .map(child => child.textContent)
      .join('');
  }

  set textContent(value) {
    // 모든 자식 제거
    while (this.firstChild) {
      this.removeChild(this.firstChild);
    }
    // 새 텍스트 노드 추가
    if (value) {
      this.appendChild(new Text(value));
    }
  }

  /**
   * 자식 노드 추가 (맨 뒤에)
   */
  appendChild(child) {
    // 이미 다른 부모에 속해있다면 먼저 제거
    if (child.parentNode) {
      child.parentNode.removeChild(child);
    }

    child.parentNode = this;
    this.childNodes.push(child);

    return child;
  }

  /**
   * 특정 위치에 노드 삽입
   */
  insertBefore(newNode, referenceNode) {
    if (!referenceNode) {
      return this.appendChild(newNode);
    }

    const index = this.childNodes.indexOf(referenceNode);
    if (index === -1) {
      throw new Error('Reference node not found');
    }

    if (newNode.parentNode) {
      newNode.parentNode.removeChild(newNode);
    }

    newNode.parentNode = this;
    this.childNodes.splice(index, 0, newNode);

    return newNode;
  }

  /**
   * 자식 노드 제거
   */
  removeChild(child) {
    const index = this.childNodes.indexOf(child);
    if (index === -1) {
      throw new Error('Node not found');
    }

    child.parentNode = null;
    this.childNodes.splice(index, 1);

    return child;
  }

  /**
   * 자식 노드 교체
   */
  replaceChild(newChild, oldChild) {
    const index = this.childNodes.indexOf(oldChild);
    if (index === -1) {
      throw new Error('Node not found');
    }

    if (newChild.parentNode) {
      newChild.parentNode.removeChild(newChild);
    }

    oldChild.parentNode = null;
    newChild.parentNode = this;
    this.childNodes[index] = newChild;

    return oldChild;
  }

  /**
   * 노드 복제
   */
  cloneNode(deep = false) {
    const clone = new this.constructor();

    if (deep) {
      for (const child of this.childNodes) {
        clone.appendChild(child.cloneNode(true));
      }
    }

    return clone;
  }

  /**
   * 자손 노드 포함 여부 확인
   */
  contains(node) {
    if (node === this) return true;

    for (const child of this.childNodes) {
      if (child.contains(node)) return true;
    }

    return false;
  }
}


// ============================================================
// 4. Text - 텍스트 노드 (Node 상속)
// ============================================================
class Text extends Node {
  constructor(data = '') {
    super(Node.TEXT_NODE);
    this.data = data;
    this.nodeName = '#text';
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


// ============================================================
// 5. Element - HTML 요소 (Node 상속)
// ============================================================
class Element extends Node {
  constructor(tagName) {
    super(Node.ELEMENT_NODE);

    this.tagName = tagName.toUpperCase();
    this.nodeName = this.tagName;
    this.attributes = new Map();  // 속성 저장소
    this.id = '';
    this.className = '';
  }

  // 속성 관련 메서드
  getAttribute(name) {
    if (name === 'id') return this.id;
    if (name === 'class') return this.className;
    return this.attributes.get(name) || null;
  }

  setAttribute(name, value) {
    if (name === 'id') {
      this.id = value;
    } else if (name === 'class') {
      this.className = value;
    }
    this.attributes.set(name, value);
  }

  removeAttribute(name) {
    if (name === 'id') this.id = '';
    if (name === 'class') this.className = '';
    this.attributes.delete(name);
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  // classList (간소화 버전)
  get classList() {
    const self = this;
    return {
      _classes: () => self.className.split(/\s+/).filter(Boolean),

      add(...classes) {
        const current = new Set(this._classes());
        classes.forEach(c => current.add(c));
        self.className = [...current].join(' ');
      },

      remove(...classes) {
        const current = new Set(this._classes());
        classes.forEach(c => current.delete(c));
        self.className = [...current].join(' ');
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

  // 자식 요소만 필터링
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

  /**
   * innerHTML getter - 자식 노드들을 HTML 문자열로
   */
  get innerHTML() {
    return this.childNodes.map(child => {
      if (child instanceof Text) {
        return child.data;
      }
      if (child instanceof Element) {
        return child.outerHTML;
      }
      return '';
    }).join('');
  }

  /**
   * innerHTML setter - HTML 파싱은 생략, 텍스트로 처리
   */
  set innerHTML(html) {
    // 실제로는 HTML 파서가 필요하지만, 여기서는 텍스트로 처리
    while (this.firstChild) {
      this.removeChild(this.firstChild);
    }
    if (html) {
      this.appendChild(new Text(html));
    }
  }

  /**
   * outerHTML - 자신을 포함한 HTML 문자열
   */
  get outerHTML() {
    const attrs = [];
    for (const [key, value] of this.attributes) {
      attrs.push(`${key}="${value}"`);
    }
    const attrStr = attrs.length ? ' ' + attrs.join(' ') : '';
    const tag = this.tagName.toLowerCase();

    // 셀프 클로징 태그
    const voidElements = ['br', 'hr', 'img', 'input', 'meta', 'link'];
    if (voidElements.includes(tag)) {
      return `<${tag}${attrStr}>`;
    }

    return `<${tag}${attrStr}>${this.innerHTML}</${tag}>`;
  }

  /**
   * CSS 셀렉터로 자손 요소 검색 (간소화)
   */
  querySelector(selector) {
    return this._querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    return this._querySelectorAll(selector);
  }

  _querySelectorAll(selector) {
    const results = [];

    // 간단한 셀렉터만 지원: #id, .class, tag
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
    };

    traverse(this);
    return results;
  }

  _createMatcher(selector) {
    if (selector.startsWith('#')) {
      const id = selector.slice(1);
      return (el) => el.id === id;
    }
    if (selector.startsWith('.')) {
      const className = selector.slice(1);
      return (el) => el.classList.contains(className);
    }
    // 태그 이름
    const tagName = selector.toUpperCase();
    return (el) => el.tagName === tagName;
  }

  /**
   * 가장 가까운 조상 요소 검색
   */
  closest(selector) {
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

    // 속성 복사
    for (const [key, value] of this.attributes) {
      clone.setAttribute(key, value);
    }

    // 깊은 복사
    if (deep) {
      for (const child of this.childNodes) {
        clone.appendChild(child.cloneNode(true));
      }
    }

    return clone;
  }
}


// ============================================================
// 6. Document - 문서 루트 (Node 상속)
// ============================================================
class Document extends Node {
  constructor() {
    super(Node.DOCUMENT_NODE);
    this.nodeName = '#document';

    // 루트 요소 (html)
    this.documentElement = null;
  }

  /**
   * 요소 생성 팩토리 메서드
   */
  createElement(tagName) {
    return new Element(tagName);
  }

  /**
   * 텍스트 노드 생성
   */
  createTextNode(data) {
    return new Text(data);
  }

  /**
   * ID로 요소 검색
   */
  getElementById(id) {
    const search = (node) => {
      for (const child of node.childNodes) {
        if (child instanceof Element) {
          if (child.id === id) return child;
          const found = search(child);
          if (found) return found;
        }
      }
      return null;
    };

    return search(this);
  }

  /**
   * 태그 이름으로 요소 검색
   */
  getElementsByTagName(tagName) {
    const results = [];
    const targetTag = tagName.toUpperCase();

    const search = (node) => {
      for (const child of node.childNodes) {
        if (child instanceof Element) {
          if (tagName === '*' || child.tagName === targetTag) {
            results.push(child);
          }
          search(child);
        }
      }
    };

    search(this);
    return results;
  }

  /**
   * 클래스 이름으로 요소 검색
   */
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
      // documentElement도 검사
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


// ============================================================
// 7. 사용 예제 및 테스트
// ============================================================
function runDemo() {
  console.log('='.repeat(60));
  console.log('Mini DOM Implementation Demo');
  console.log('='.repeat(60));

  // 1. Document와 요소 생성
  console.log('\n[1] Document와 요소 생성');
  const doc = new Document();

  const html = doc.createElement('html');
  const body = doc.createElement('body');
  const div = doc.createElement('div');
  const p = doc.createElement('p');
  const span = doc.createElement('span');

  div.setAttribute('id', 'container');
  div.setAttribute('class', 'main-container active');
  p.setAttribute('id', 'paragraph');

  console.log(`div.tagName: ${div.tagName}`);
  console.log(`div.id: ${div.id}`);
  console.log(`div.className: ${div.className}`);

  // 2. DOM 트리 구성
  console.log('\n[2] DOM 트리 구성');
  doc.documentElement = html;
  doc.appendChild(html);
  html.appendChild(body);
  body.appendChild(div);
  div.appendChild(p);
  p.appendChild(span);
  span.appendChild(doc.createTextNode('Hello, DOM!'));

  console.log(`textContent: "${div.textContent}"`);
  console.log(`innerHTML: "${div.innerHTML}"`);
  console.log(`outerHTML: "${div.outerHTML}"`);

  // 3. 트리 탐색
  console.log('\n[3] 트리 탐색');
  console.log(`span.parentNode.tagName: ${span.parentNode.tagName}`);
  console.log(`div.firstChild.tagName: ${div.firstChild.tagName}`);
  console.log(`body.contains(span): ${body.contains(span)}`);

  // 4. 요소 검색
  console.log('\n[4] 요소 검색');
  console.log(`getElementById('paragraph'): ${doc.getElementById('paragraph')?.tagName}`);
  console.log(`querySelector('.main-container'): ${doc.querySelector('.main-container')?.tagName}`);
  console.log(`getElementsByTagName('*').length: ${doc.getElementsByTagName('*').length}`);

  // 5. 이벤트 시스템 테스트
  console.log('\n[5] 이벤트 시스템 (Capturing → Target → Bubbling)');

  // 각 요소에 이벤트 리스너 등록
  div.addEventListener('click', (e) => {
    console.log(`  DIV: bubbling phase (phase=${e.eventPhase})`);
  });

  div.addEventListener('click', (e) => {
    console.log(`  DIV: capturing phase (phase=${e.eventPhase})`);
  }, true);  // capture=true

  p.addEventListener('click', (e) => {
    console.log(`  P: bubbling phase (phase=${e.eventPhase})`);
  });

  span.addEventListener('click', (e) => {
    console.log(`  SPAN: at target (phase=${e.eventPhase})`);
    console.log(`  SPAN: target=${e.target.tagName}, currentTarget=${e.currentTarget.tagName}`);
  });

  // 클릭 이벤트 발생
  const clickEvent = new Event('click', { bubbles: true });
  console.log('Dispatching click event on SPAN:');
  span.dispatchEvent(clickEvent);

  // 6. stopPropagation 테스트
  console.log('\n[6] stopPropagation 테스트');
  span.addEventListener('click', (e) => {
    e.stopPropagation();
    console.log('  SPAN: propagation stopped!');
  });

  const clickEvent2 = new Event('click', { bubbles: true });
  console.log('Dispatching click event on SPAN (with stopPropagation):');
  span.dispatchEvent(clickEvent2);

  // 7. classList 테스트
  console.log('\n[7] classList 조작');
  console.log(`Before: ${div.className}`);
  div.classList.remove('active');
  console.log(`After remove('active'): ${div.className}`);
  div.classList.add('highlighted', 'bordered');
  console.log(`After add('highlighted', 'bordered'): ${div.className}`);
  console.log(`classList.contains('highlighted'): ${div.classList.contains('highlighted')}`);

  // 8. 노드 조작
  console.log('\n[8] 노드 조작');
  const newP = doc.createElement('p');
  newP.setAttribute('id', 'new-paragraph');
  newP.textContent = 'New paragraph';

  div.insertBefore(newP, p);
  console.log(`div.children.length: ${div.children.length}`);
  console.log(`div.firstElementChild.id: ${div.firstElementChild.id}`);

  // 9. 노드 복제
  console.log('\n[9] 노드 복제');
  const clonedDiv = div.cloneNode(true);  // deep clone
  console.log(`Cloned div outerHTML: ${clonedDiv.outerHTML}`);
  console.log(`Original === Clone: ${div === clonedDiv}`);

  console.log('\n' + '='.repeat(60));
  console.log('Demo completed!');
  console.log('='.repeat(60));
}

// 모듈 내보내기 (Node.js 환경)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EventTarget, Event, Node, Text, Element, Document, runDemo };
}

// 직접 실행 시에만 데모 실행 (require 시 실행 안 함)
if (require.main === module) {
  runDemo();
}
