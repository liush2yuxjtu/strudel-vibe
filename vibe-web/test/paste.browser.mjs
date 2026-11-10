import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const base = new URL(process.env.JAMFLOW_URL || 'https://jamflow-gray.vercel.app/');
const output = path.resolve(process.env.JAMFLOW_EVIDENCE || 'paste-evidence');
const realGeneration = process.env.JAMFLOW_REAL_GENERATION === '1';
const official = '$: s("[bd <hh oh>]*2").bank("tr909").dec(.4)';
const edited = 'note("e4").s("sine").gain(0.15)';
await fs.mkdir(output, { recursive: true });
const report = { url: base.origin, started: new Date().toISOString(), engine: 'real Strudel', api: 'real, no response mocks', mobile: 'Chromium touch emulation', humanHearing: 'UNKNOWN', cases: [], generation: null };
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox'] });
report.browser = browser.version();
const state = page => page.evaluate(async () => ({ ...await window.__vibeWebMcp.getStatus(), ui: document.querySelector('#state').innerText, feedback: document.querySelector('#codeFeedback').textContent, editor: document.querySelector('#code').value, current: window.__vibe.current() }));
async function until(page, predicate, timeout = 12000) {
  const end = Date.now() + timeout;
  let last;
  do {
    last = await state(page);
    if(predicate(last)) return last;
    await new Promise(resolve => setTimeout(resolve, 100));
  } while(Date.now() < end);
  throw new Error('Timed out waiting for state: ' + JSON.stringify(last));
}
async function screenshot(page, name) {
  await page.screenshot({ path: path.join(output, name), fullPage: true });
  return name;
}
async function importCode(page, code) {
  await page.evaluate(text => navigator.clipboard.writeText(text), code);
  await page.locator('.chip-paste').click();
  return until(page, s => s.import_stage === 'ready' && s.editor === code);
}
async function signal(page) {
  return until(page, s => s.phase === 'playing' && s.audio_state === 'running' && s.playback_evidence === 'engine_signal');
}
async function record(item, page, name, check) {
  const value = await state(page);
  assert.ok(check(value), name + ': ' + JSON.stringify(value));
  item.checks.push({ name, verdict: 'PASS', state: value });
  console.log('PASS ' + item.id + ' ' + name);
  return value;
}
try {
  for(const config of [
    { id:'desktop-zh', lang:'zh', width:1440, height:900 },
    { id:'desktop-en', lang:'en', width:1440, height:900 },
    { id:'mobile-zh', lang:'zh', width:390, height:844, mobile:true },
    { id:'mobile-en', lang:'en', width:360, height:844, mobile:true },
  ]) {
    const item = { ...config, checks:[], events:[], networkFailures:[] };
    report.cases.push(item);
    const context = await browser.newContext({ viewport:{width:config.width,height:config.height}, isMobile:!!config.mobile, hasTouch:!!config.mobile, deviceScaleFactor:config.mobile ? 2 : 1 });
    await context.grantPermissions(['clipboard-read','clipboard-write'], {origin:base.origin});
    const page = await context.newPage();
    page.on('requestfailed', request => item.networkFailures.push({url:request.url().split('?')[0],error:request.failure()?.errorText}));
    let generationRequests = 0;
    await page.route('**/api/vibe', async route => {
      const request = route.request();
      const body = request.method() === 'POST' ? request.postDataJSON() : null;
      if(body?.intent) {
        generationRequests++;
        if(!realGeneration || config.id !== 'desktop-zh' || generationRequests > 1) return route.abort();
      }
      return route.continue();
    });
    try {
      const url = new URL(base); url.searchParams.set('audit','paste-fix-' + config.id); url.searchParams.set('lang',config.lang);
      const response = await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:30000});
      assert.equal(response.status(),200);
      await page.waitForFunction(()=>!!window.__vibeWebMcp);
      // The async SDK replaces the snippet's queued track stub when it loads.
      await page.waitForFunction(()=>{
        const deviceId=window.amplitude?.getDeviceId?.();
        return typeof deviceId==='string' && deviceId.length>0;
      },null,{timeout:15000});
      await page.evaluate(()=>{
        window.__pasteAuditEvents=[];
        const original=window.amplitude.track;
        window.__pasteAuditTrack=window.amplitude.track=function(name,props,...args){
          window.__pasteAuditEvents.push({event_type:name,event_properties:JSON.parse(JSON.stringify(props||{}))});
          return original.call(this,name,props,...args);
        };
      });
      item.layout = await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,pasteHeight:document.querySelector('.chip-paste').getBoundingClientRect().height,viewport:document.querySelector('meta[name=viewport]').content}));
      assert.equal(item.layout.width,item.layout.scrollWidth,'no horizontal overflow');
      assert.ok(item.layout.pasteHeight>=44,'paste touch target');
      assert.ok(!item.layout.viewport.includes('maximum-scale'),'zoom is available');
      const pasted = await importCode(page,official);
      await record(item,page,'paste waits for Apply',s=>s.phase==='idle'&&s.playback_evidence==='none'&&!!s.import_attempt_id);
      await page.locator('#apply').click(); await signal(page);
      await record(item,page,'official Strudel default reaches engine signal',s=>s.current===official&&s.attempt_id===pasted.import_attempt_id&&s.playback_evidence==='engine_signal');
      item.playingScreenshot=await screenshot(page,config.id+'-tr909-playing.png');
      const previous=await state(page);
      await page.locator('#code').fill(edited);
      await record(item,page,'unapplied editor is distinct from playing code',s=>s.current===official&&s.code_preview===official&&s.editor_code_preview===edited&&s.editor_dirty&&s.attempt_id===previous.attempt_id);
      await page.locator('#apply').click(); await signal(page);
      await record(item,page,'edited code applies',s=>s.current===edited&&!s.editor_dirty&&s.attempt_id!==previous.attempt_id);
      await page.locator('#stop').click();
      await record(item,page,'Stop clears playback evidence',s=>s.phase==='idle'&&!s.playing&&s.playback_evidence==='none');
      await page.locator('#play').click(); await signal(page);
      await record(item,page,'replay reaches engine signal',s=>s.current===edited&&s.playback_evidence==='engine_signal');
      await page.locator('#stop').click();
      const replayImport = await importCode(page,edited);
      await page.locator('#play').click(); await signal(page);
      await record(item,page,'Play preserves imported operation identity',s=>s.attempt_id===replayImport.import_attempt_id&&s.current===edited);
      await page.locator('#stop').click();
      await importCode(page,'s("bd"'); await page.locator('#apply').click();
      await until(page,s=>s.phase==='idle'&&/token|Unexpected/.test(s.ui));
      await record(item,page,'invalid syntax fails without playback',s=>s.playback_evidence==='none'&&!s.playing);
      await importCode(page,'s("bd").bank("missing_bank")'); await page.locator('#apply').click();
      await until(page,s=>s.phase==='idle'&&s.feedback.includes('missing_bank'));
      await record(item,page,'unknown sound has actionable recovery',s=>s.playback_evidence==='none'&&s.feedback.includes('missing_bank'));
      item.unsupportedScreenshot=await screenshot(page,config.id+'-unknown-bank.png');
      await page.locator('#compatibleExample').click();
      await record(item,page,'compatible example does not auto-play',s=>s.phase==='idle'&&s.editor.length>0);
      await page.locator('#apply').click(); await signal(page);
      await record(item,page,'compatible example recovers to engine signal',s=>s.playback_evidence==='engine_signal');
      await page.locator('#stop').click();
      await page.evaluate(()=>navigator.clipboard.writeText(''));
      await page.locator('.chip-paste').click();
      await until(page,s=>/empty|为空/i.test(s.feedback));
      await record(item,page,'empty clipboard is distinguished',s=>/empty|为空/i.test(s.feedback)&&s.phase==='idle');
      await context.clearPermissions();
      await page.locator('.chip-paste').click();
      await until(page,s=>/unavailable|无法读取/i.test(s.feedback));
      await record(item,page,'clipboard denial gives manual fallback',s=>/unavailable|无法读取/i.test(s.feedback));
      await context.grantPermissions(['clipboard-read','clipboard-write'],{origin:base.origin});
      await page.locator('#send').click();
      await record(item,page,'natural language empty-input still works',s=>/Describe|先写/.test(s.ui));
      if(realGeneration && config.id==='desktop-zh') {
        await page.locator('#code').fill(edited); await page.locator('#apply').click(); await signal(page);
        await page.evaluate(()=>navigator.clipboard.writeText('note("g4").s("sine")'));
        let requestBody;
        const pendingResponse=page.waitForResponse(r=>r.url()===base.origin+'/api/vibe'&&!!r.request().postDataJSON()?.intent,{timeout:60000});
        page.on('request',r=>{if(r.url()===base.origin+'/api/vibe'&&r.method()==='POST'&&r.postDataJSON()?.intent)requestBody=r.postDataJSON();});
        await page.locator('#intent').fill('保留正弦音色，用 C4 E4 G4 E4 做轻柔稀疏旋律。');
        await page.locator('#send').click();
        await until(page,s=>s.phase==='composing');
        const before=await state(page);
        assert.equal(await page.locator('.chip-paste').isDisabled(),true);
        assert.equal(await page.locator('#apply').isDisabled(),true);
        assert.equal(await page.locator('#code').getAttribute('readonly'),'');
        const guarded=await page.evaluate(()=>window.__vibe.openPasteBridge());
        assert.equal(guarded.code,'BUSY');
        const after=await state(page); assert.equal(after.editor,before.editor); assert.equal(after.ui,before.ui);
        const busyScreenshot=await screenshot(page,'real-generation-busy.png');
        const response=await pendingResponse;const data=await response.json();assert.equal(response.status(),200);assert.ok(data.code);
        const played=await signal(page);
        assert.equal(played.current,data.code);
        assert.equal(requestBody.current,edited);
        assert.equal(generationRequests,1,'exactly one real model request');
        report.generation={requests:generationRequests,request:requestBody,response:data,status:response.status(),playing:played,busyScreenshot,guards:'PASS',sameAttemptEvidence:false,exactCharge:'not returned'};
        await page.locator('#stop').click();
      }
      assert.equal(await page.evaluate(()=>window.amplitude.track===window.__pasteAuditTrack),true,'Amplitude recorder was not replaced');
      item.events=await page.evaluate(()=>window.__pasteAuditEvents);
      if(report.generation && config.id==='desktop-zh'){
        const attempt=report.generation.playing.attempt_id;
        for(const name of ['vibe_generate_submit','vibe_generate_request_sent','vibe_generate_success','playback_started','playback_signal']){
          assert.ok(item.events.some(e=>e.event_type===name&&e.event_properties.attempt_id===attempt),'same generation attempt '+name);
        }
        report.generation.sameAttemptEvidence=true;
      }
      const start=item.events.find(e=>e.event_type==='paste_bridge_open'&&e.event_properties.attempt_id===pasted.import_attempt_id);
      assert.ok(start);
      for(const name of ['paste_bridge_ready','paste_bridge_apply','playback_started','playback_signal']){
        const event=item.events.find(e=>e.event_type===name&&e.event_properties.attempt_id===pasted.import_attempt_id);
        assert.ok(event,'correlated '+name);assert.equal(event.event_properties.source,'paste_bridge');
      }
      if(!realGeneration) assert.equal(generationRequests,0,'no paid generation requests');
      item.final=await state(page);assert.equal(item.final.phase,'idle');
      item.verdict='PASS';
    }catch(error){
      item.verdict='FAIL';item.error=error.stack;
      try{item.failedState=await state(page);item.failureScreenshot=await screenshot(page,config.id+'-failure.png');await page.locator('#stop').click();}catch{}
    }finally{
      await fs.writeFile(path.join(output,'results.json'),JSON.stringify(report,null,2));
      await context.close();
    }
  }
}finally{
  await browser.close();
  report.verdict=report.cases.length===4&&report.cases.every(c=>c.verdict==='PASS')?'PASS':'FAIL';
  await fs.writeFile(path.join(output,'results.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({verdict:report.verdict,cases:report.cases.map(c=>({id:c.id,verdict:c.verdict,checks:c.checks.length,error:c.error})),realGeneration:report.generation?.status}));
}
if(report.verdict!=='PASS')process.exitCode=1;
