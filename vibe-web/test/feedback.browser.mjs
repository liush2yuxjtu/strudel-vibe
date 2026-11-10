import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || undefined,args:['--no-sandbox']});
const target=process.env.JAMFLOW_URL || 'http://localhost:3000';
const out=process.env.JAMFLOW_EVIDENCE || 'feedback-evidence';
await mkdir(out,{recursive:true});
const report={url:target,cases:[],realSubmissions:0};
try{
 for(const [id,lang,width,height] of [['desktop-zh','zh',1440,900],['desktop-en','en',1440,900],['mobile-zh','zh',390,844],['mobile-en','en',360,844]]){
  const real=process.env.FEEDBACK_REAL_SUBMIT==='1' && id==='desktop-zh';
  const ctx=await browser.newContext({viewport:{width,height},isMobile:width<500,hasTouch:width<500});
  await ctx.route('**/api/vibe',async route=>{
   if(route.request().method()==='POST' && JSON.parse(route.request().postData() || '{}').intent)throw Error('Unexpected model request');
   await route.continue();
  });
  if(!real)await ctx.route('https://submit.jotform.com/**',r=>r.abort());
  const page=await ctx.newPage();
  await page.goto(`${target}/?audit=feedback-20261110&lang=${lang}`,{waitUntil:'networkidle'});
  await page.locator('#intent').fill('PRIVATE_PROMPT');await page.locator('#code').fill('PRIVATE_CODE');
  await page.locator('#feedbackOpen').click();
  await page.waitForFunction(()=>document.querySelector('#feedbackDiagnostics').value.includes('feedback-v1'));
  assert.equal(await page.locator('#feedbackDialog').evaluate(x=>x.open),true);
  assert.equal(await page.locator('#feedbackMessage').evaluate(x=>x===document.activeElement),true);
  const payload=await page.locator('#feedbackForm').evaluate(x=>Object.fromEntries(new FormData(x)));
  assert.ok(!JSON.stringify(payload).includes('PRIVATE_'));assert.ok(!('q5_q5_textarea3' in payload));
  assert.equal(JSON.parse(payload.q4_q4_textarea2).language,lang);
  await page.locator('#feedbackSend').click();assert.equal(await page.locator('#feedbackMessage').evaluate(x=>x.validity.valueMissing),true);
  await page.locator('#feedbackInclude').check();assert.ok((await page.locator('#feedbackContext').inputValue()).includes('PRIVATE_CODE'));
  await page.locator('#feedbackContext').fill('User-reviewed context');
  await page.locator('#feedbackInclude').uncheck();assert.equal(await page.locator('#feedbackContext').inputValue(),'');
  const message='[INTERNAL_TEST feedback-20261110] Anonymous browser feedback receipt check; no action required.';
  await page.locator('#feedbackMessage').fill(message);
  await page.locator('#feedbackClose').click();await page.locator('#feedbackOpen').click();assert.equal(await page.locator('#feedbackMessage').inputValue(),message);
  assert.ok(await page.locator('#feedbackFallback').getAttribute('href'));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:`${out}/${id}.png`,fullPage:true});
  const popupPromise=ctx.waitForEvent('page');await page.locator('#feedbackSend').click();const popup=await popupPromise;
  try{await popup.waitForLoadState('domcontentloaded',{timeout:30000});}catch{}
  if(real){
   await popup.waitForURL(u=>u.href!=='about:blank',{timeout:30000});
   await popup.getByText(/反馈已收到|Feedback received|Thank You|Thank you/i).first().waitFor({timeout:30000});
  }
  const receipt={url:popup.url(),text:(await popup.locator('body').innerText().catch(()=>'' )).slice(0,4000)};
  if(real){
   report.realSubmissions++;
   await popup.screenshot({path:`${out}/receipt.png`,fullPage:true});
   assert.match(receipt.text,/Thank You|Thank you|反馈已收到|Feedback received/i);
   report.receipt=receipt;
  }else assert.equal(await page.locator('#feedbackMessage').inputValue(),message);
  assert.equal(await page.locator('#feedbackHandoff').isVisible(),true);
  await page.keyboard.press('Escape');assert.equal(await page.locator('#feedbackDialog').evaluate(x=>x.open),false);
  report.cases.push({id,lang,width,verdict:'PASS',checks:['opens with focus','empty validation','private text excluded by default','diagnostic language','explicit editable context','uncheck excludes context','cancel retains draft','standalone fallback','no overflow','native submission handoff','draft retained after handoff','Escape closes'],receipt:real?'real provider receipt':'network aborted, draft retained'});
  await ctx.close();
 }
 report.verdict='PASS';
}finally{
 await writeFile(`${out}/results.json`,JSON.stringify(report,null,2));await browser.close();
}
console.log(JSON.stringify(report));
