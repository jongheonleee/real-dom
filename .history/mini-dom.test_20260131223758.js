/**
 * Mini DOM TDD Tests
 * 실행: node mini-dom.test.js
 *
 * TDD 순서: EventTarget → Node → Text → Element → Document → Event 전파
 */

const assert = require('assert');
const { EventTarget, Event, Node, Text, Element, Document } = require('./mini-dom');

let passed = 0, failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`✗ ${name}`);
    console.log(`  ${e.message}`);
    failed++;
  }
}

function describe(name, fn) {
  console.log(`\n[${name}]`);
  fn();
}

// ============================================================
// 1. EventTarget Tests
// ============================================================
describe('EventTarget', () => {
  test('addEventListener 등록 후 dispatchEvent로 호출', () => {
    const target = new EventTarget();
    let called = false;
    target.addEventListener('test', () => { called = true; });
    target.dispatchEvent(new Event('test'));
    assert.strictEqual(called, true);
  });

  test('removeEventListener로 제거', () => {
    const target = new EventTarget();
    let count = 0;
    const handler = () => { count++; };
    target.addEventListener('test', handler);
    target.removeEventListener('test', handler);
    target.dispatchEvent(new Event('test'));
    assert.strictEqual(count, 0);
  });

  test('once 옵션은 한 번만 실행', () => {
    const target = new EventTarget();
    let count = 0;
    target.addEventListener('test', () => { count++; }, { once: true });
    target.dispatchEvent(new Event('test'));
    target.dispatchEvent(new Event('test'));
    assert.strictEqual(count, 1);
  });
});

// ============================================================
// 2. Node Tests
// ============================================================
describe('Node', () => {
  test('appendChild로 자식 추가', () => {
    const parent = new Node(1);
    const child = new Node(1);
    parent.appendChild(child);
    assert.strictEqual(parent.childNodes.length, 1);
    assert.strictEqual(child.parentNode, parent);
  });

  test('firstChild, lastChild 반환', () => {
    const parent = new Node(1);
    const child1 = new Node(1);
    const child2 = new Node(1);
    parent.appendChild(child1);
    parent.appendChild(child2);
    assert.strictEqual(parent.firstChild, child1);
    assert.strictEqual(parent.lastChild, child2);
  });

  test('nextSibling, previousSibling 반환', () => {
    const parent = new Node(1);
    const child1 = new Node(1);
    const child2 = new Node(1);
    parent.appendChild(child1);
    parent.appendChild(child2);
    assert.strictEqual(child1.nextSibling, child2);
    assert.strictEqual(child2.previousSibling, child1);
  });

  test('removeChild로 자식 제거', () => {
    const parent = new Node(1);
    const child = new Node(1);
    parent.appendChild(child);
    parent.removeChild(child);
    assert.strictEqual(parent.childNodes.length, 0);
    assert.strictEqual(child.parentNode, null);
  });

  test('insertBefore로 특정 위치에 삽입', () => {
    const parent = new Node(1);
    const child1 = new Node(1);
    const child2 = new Node(1);
    parent.appendChild(child2);
    parent.insertBefore(child1, child2);
    assert.strictEqual(parent.firstChild, child1);
  });

  test('contains로 자손 포함 확인', () => {
    const grandparent = new Node(1);
    const parent = new Node(1);
    const child = new Node(1);
    grandparent.appendChild(parent);
    parent.appendChild(child);
    assert.strictEqual(grandparent.contains(child), true);
    assert.strictEqual(child.contains(grandparent), false);
  });
});

// ============================================================
// 3. Text Tests
// ============================================================
describe('Text', () => {
  test('data 속성으로 텍스트 저장', () => {
    const text = new Text('Hello');
    assert.strictEqual(text.data, 'Hello');
    assert.strictEqual(text.nodeType, Node.TEXT_NODE);
  });

  test('textContent는 data 반환', () => {
    const text = new Text('World');
    assert.strictEqual(text.textContent, 'World');
  });

  test('cloneNode는 독립적인 복사본', () => {
    const text = new Text('Original');
    const clone = text.cloneNode();
    clone.data = 'Clone';
    assert.strictEqual(text.data, 'Original');
  });
});

// ============================================================
// 4. Element Tests
// ============================================================
describe('Element', () => {
  test('tagName은 대문자로 저장', () => {
    const div = new Element('div');
    assert.strictEqual(div.tagName, 'DIV');
  });

  test('setAttribute/getAttribute', () => {
    const div = new Element('div');
    div.setAttribute('id', 'myId');
    assert.strictEqual(div.getAttribute('id'), 'myId');
    assert.strictEqual(div.id, 'myId');
  });

  test('classList.add/remove/contains', () => {
    const div = new Element('div');
    div.classList.add('foo', 'bar');
    assert.strictEqual(div.classList.contains('foo'), true);
    div.classList.remove('foo');
    assert.strictEqual(div.classList.contains('foo'), false);
  });

  test('children은 Element만 반환', () => {
    const div = new Element('div');
    div.appendChild(new Text('text'));
    div.appendChild(new Element('span'));
    assert.strictEqual(div.children.length, 1);
  });

  test('textContent는 자손 텍스트 합침', () => {
    const div = new Element('div');
    const span = new Element('span');
    span.appendChild(new Text('Hello'));
    div.appendChild(span);
    assert.strictEqual(div.textContent, 'Hello');
  });

  test('querySelector로 자손 검색', () => {
    const div = new Element('div');
    const span = new Element('span');
    span.setAttribute('id', 'target');
    div.appendChild(span);
    assert.strictEqual(div.querySelector('#target'), span);
  });
});

// ============================================================
// 5. Document Tests
// ============================================================
describe('Document', () => {
  test('createElement로 Element 생성', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    assert.strictEqual(div instanceof Element, true);
  });

  test('createTextNode로 Text 생성', () => {
    const doc = new Document();
    const text = doc.createTextNode('Hello');
    assert.strictEqual(text instanceof Text, true);
  });

  test('getElementById로 검색', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    div.setAttribute('id', 'test');
    doc.appendChild(div);
    assert.strictEqual(doc.getElementById('test'), div);
  });

  test('getElementsByTagName으로 검색', () => {
    const doc = new Document();
    const div1 = doc.createElement('div');
    const div2 = doc.createElement('div');
    doc.appendChild(div1);
    doc.appendChild(div2);
    assert.strictEqual(doc.getElementsByTagName('div').length, 2);
  });
});

// ============================================================
// 6. Event Propagation Tests
// ============================================================
describe('Event Propagation', () => {
  test('이벤트는 Capturing → Target → Bubbling 순서', () => {
    const parent = new Element('div');
    const child = new Element('span');
    parent.appendChild(child);

    const phases = [];
    parent.addEventListener('click', (e) => phases.push(`parent-capture-${e.eventPhase}`), true);
    parent.addEventListener('click', (e) => phases.push(`parent-bubble-${e.eventPhase}`));
    child.addEventListener('click', (e) => phases.push(`child-capture-${e.eventPhase}`), true);
    child.addEventListener('click', (e) => phases.push(`child-bubble-${e.eventPhase}`));

    child.dispatchEvent(new Event('click', { bubbles: true }));

    // AT_TARGET(2)에서는 capture/bubble 리스너 모두 호출됨 (실제 DOM 동작)
    assert.deepStrictEqual(phases, [
      'parent-capture-1',  // CAPTURING_PHASE
      'child-capture-2',   // AT_TARGET (capture)
      'child-bubble-2',    // AT_TARGET (bubble)
      'parent-bubble-3'    // BUBBLING_PHASE
    ]);
  });

  test('stopPropagation은 전파 중단', () => {
    const parent = new Element('div');
    const child = new Element('span');
    parent.appendChild(child);

    let parentCalled = false;
    parent.addEventListener('click', () => { parentCalled = true; });
    child.addEventListener('click', (e) => { e.stopPropagation(); });

    child.dispatchEvent(new Event('click', { bubbles: true }));
    assert.strictEqual(parentCalled, false);
  });

  test('bubbles: false면 버블링 안 함', () => {
    const parent = new Element('div');
    const child = new Element('span');
    parent.appendChild(child);

    let parentCalled = false;
    parent.addEventListener('click', () => { parentCalled = true; });

    child.dispatchEvent(new Event('click', { bubbles: false }));
    assert.strictEqual(parentCalled, false);
  });
});

// ============================================================
// Summary
// ============================================================
console.log(`\n${'='.repeat(40)}`);
console.log(`Total: ${passed + failed}, Passed: ${passed}, Failed: ${failed}`);
console.log('='.repeat(40));

process.exit(failed > 0 ? 1 : 0);
