import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const baseUrl = new URL(process.env.JAMFLOW_URL || 'https://jamflow-gray.vercel.app/');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {}),args:['--no-sandbox']});
 const reports=[];
 const awaitSignal=async page=>{
  for(let i=0;i<80;i++){
   const status=await page.evaluate(()=>window.__vibeWebMcp.getStatus());
   if(status.playback_evidence==='engine_signal')return status;
   await page.waitForTimeout(100);
  }
  throw new Error('No engine audio signal observed');
 };
 const generated='stack(s("bd*4, ~ cp, hh*8").gain(0.8), note("<c2 c2 eb2 g2>").s("sine").lpf(500).gain(0.5).room(0.2))';
 try{
  for(const width of [390,360]){
   const ctx=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
   await ctx.addInitScript(()=>{window.__WEBMCP_TELEMETRY__=false});
   const page=await ctx.newPage();let blockedGenerate=0;
   await page.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url());
    if(url.origin!==baseUrl.origin)return route.abort();
    if(url.pathname==='/api/vibe'&&req.method()==='POST'&&req.postDataJSON()?.intent){blockedGenerate++;return route.abort()}
    return route.continue();
   });
   const runUrl = new URL(baseUrl);
   runUrl.searchParams.set('audit', 'mobile-'+width+'-verify');
   runUrl.searchParams.set('lang','zh');
   await page.goto(runUrl.href,{waitUntil:'networkidle'});
   await page.waitForFunction(()=>!!window.__vibe);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
   assert.equal(overflow,false);
   await page.locator('#send').click();
   assert.equal(await page.locator('#intent').evaluate(e=>e===document.activeElement),true);
   assert.match(await page.locator('#state').innerText(),/先写一句/);
   const target=await page.locator('#firstDemoGo').boundingBox();assert.ok(target.height>=44);
   await page.locator('#firstDemoGo').click();
   await awaitSignal(page);
   const demo=await page.evaluate(()=>window.__vibeWebMcp.getStatus());assert.equal(demo.playback_evidence,'engine_signal');
   await page.locator('#stop').click();
   const stopped=await page.evaluate(()=>window.__vibeWebMcp.getStatus());assert.equal(stopped.phase,'idle');assert.equal(stopped.playback_evidence,'none');
   const bad=await page.evaluate(()=>window.__vibeWebMcp.controlPlayback('play',{code:'not a valid strudel pattern'}));assert.equal(bad.code,'PLAYBACK_FAILED');
   await page.locator('#code').fill(generated);await page.locator('#apply').click();
   await awaitSignal(page);
   const replay=await page.evaluate(()=>window.__vibeWebMcp.getStatus());assert.equal(replay.playback_evidence,'engine_signal');
   await page.locator('#stop').click();
   assert.equal(blockedGenerate,0);
   reports.push({width,height:844,engine:'Chromium mobile emulation',overflow,emptyInput:'PASS',demo:{phase:demo.phase,audio:demo.audio_state,evidence:demo.playback_evidence},stop:{phase:stopped.phase,evidence:stopped.playback_evidence},invalidCode:bad.code,returnedAIPatternReplay:replay.playback_evidence,demoTargetHeight:target.height,paidGenerationRequests:blockedGenerate});
   await ctx.close();
  }
  console.log(JSON.stringify({verdict:'PASS',reports}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack);process.exit(1)});
