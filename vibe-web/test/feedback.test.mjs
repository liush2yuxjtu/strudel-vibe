import test from 'node:test';
import assert from 'node:assert/strict';
import {feedbackDiagnostics,feedbackContext} from '../feedback.mjs';
test('feedback diagnostics allowlist excludes prompt, code and arbitrary status',()=>{
  const out=JSON.parse(feedbackDiagnostics({lang:'en',phase:'idle',prompt:'private',code_preview:'private',current:'secret',user_id:'identity'},{code:'PLAYBACK_FAILED',at:'now',message:'private'}));
  assert.equal(out.language,'en');assert.equal(out.last_error.code,'PLAYBACK_FAILED');
  assert.ok(!JSON.stringify(out).includes('private'));assert.ok(!JSON.stringify(out).includes('secret'));assert.ok(!JSON.stringify(out).includes('identity'));
});
test('feedback diagnostics work before engine init and limit error codes',()=>{
  assert.equal(JSON.parse(feedbackDiagnostics()).phase,'unknown');
  assert.equal(JSON.parse(feedbackDiagnostics({}, {code:'x'.repeat(100)})).last_error.code.length,80);
});
test('explicit context attachment is bounded and preserves literal code',()=>{
  assert.ok(feedbackContext('hello','s("bd")').includes('s("bd")'));
  assert.ok(feedbackContext('x'.repeat(5000),'y'.repeat(20000)).length<2000);
});
