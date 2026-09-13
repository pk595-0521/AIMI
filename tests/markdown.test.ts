import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Markdown} from '../src/components/revised/Primitives';
test('transcripts format GFM, breaks and escaped newlines without executing HTML',()=>{
 const html=renderToStaticMarkup(React.createElement(Markdown,{text:'**Decision**<br>Next\\n\\n| Metric | Value |\\n| --- | --- |\\n| Revenue | $145M |\\n\\n- First\\n- Second\\n\\n<script>alert(1)</script>\\n<img src=x onerror=alert(1)>'}));
 assert.match(html,/<strong>Decision<\/strong><br\/>/);assert.match(html,/<table>/);assert.match(html,/<ul>/);assert.ok(!html.includes('<script'));assert.ok(!html.includes('<img'));assert.ok(!html.includes('onerror'));
});
test('code preserves literal escapes and HTML examples',()=>{
 const html=renderToStaticMarkup(React.createElement(Markdown,{text:'```js\nconst newline = "\\n"; // <br>\n```'}));assert.match(html,/const newline = &quot;\\n&quot;/);assert.match(html,/&lt;br&gt;/);
});
