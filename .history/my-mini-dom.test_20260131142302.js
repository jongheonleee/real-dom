


// 테스트 환경 준비 
const assert = require("assert");
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
    console.log(`\n테스트 대상: [${name}]`);
    fn();
}


// 테스트 진행 
// 1. EventTarget 테스트 

describe('EventTarget', () => {
    test('addEventListener 등록 후 dispatchEvent로 호출', () => {
        
        const sut = new EventTarget();
        let called = false;

        sut.addEventListener('test', () => {
            called = true;
        });

        sut.dispatchEvent(new Event('test'));

        assert.strictEqual(called, true);

    })
})

