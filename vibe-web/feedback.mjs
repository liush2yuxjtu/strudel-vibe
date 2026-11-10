export const FEEDBACK_RELEASE = 'feedback-v1';
export function feedbackDiagnostics(status = {}, error = null){
  return JSON.stringify({ release: FEEDBACK_RELEASE, language: status.lang === 'en' ? 'en' : 'zh', traffic_class: status.traffic_class === 'internal_test' ? 'internal_test' : 'unknown', phase: status.phase || 'unknown', audio_state: status.audio_state || 'unknown', playback_evidence: status.playback_evidence || 'none', last_error: error ? { code: String(error.code).slice(0,80), at: error.at } : null });
}
export function feedbackContext(prompt, code){
  return `Prompt:\n${String(prompt || '').slice(0,500)}\n\nEditor code:\n${String(code || '').slice(0,1400)}`;
}
const copy = {
  zh: ['反馈问题','写一句话即可，无需账号。提交后将在新标签页显示 Jotform 的接收结果。','遇到了什么？','联系方式（可选）','附上的诊断信息','附上提示词和编辑框代码（可选）','默认仅附版本、语言、播放状态和最近错误码。请勿填写密码或 API key。反馈由 Jotform 保存。','发送反馈','关闭','无法提交？打开独立表单','请在新标签页确认是否收到反馈。未看到确认时，可重试或打开独立表单；此处保留你的内容。'],
  en: ['Report a problem','One sentence is enough. No account needed. Jotform will show the receipt in a new tab.','What happened?','Contact (optional)','Diagnostics included','Include prompt and editor code (optional)','Only version, language, playback state and last error code are included by default. Do not include passwords or API keys. Jotform stores your feedback.','Send feedback','Close','Cannot submit? Open standalone form','Check the new tab for a receipt. If none appears, retry or open the standalone form. Your draft stays here.']
};
if(typeof document !== 'undefined'){
  const $ = id => document.getElementById(id);
  const ids = ['feedbackTitle','feedbackIntro','feedbackMessageLabel','feedbackContactLabel','feedbackDiagnosticsLabel','feedbackIncludeLabel','feedbackPrivacy','feedbackSend','feedbackClose','feedbackFallback','feedbackHandoff'];
  const dialog = $('feedbackDialog');
  function translate(){
    const lang = document.documentElement.lang.startsWith('en') ? 'en' : 'zh';
    ids.forEach((id,i) => { $(id).textContent = copy[lang][i]; });
    $('feedbackOpen').textContent = copy[lang][0];
    $('feedbackMessage').setAttribute('aria-label',copy[lang][2]);
    $('feedbackContact').setAttribute('aria-label',copy[lang][3]);
    $('feedbackDiagnostics').setAttribute('aria-label',copy[lang][4]);
    $('feedbackContext').setAttribute('aria-label',copy[lang][5]);
  }
  async function snapshot(){
    let status = {};
    try{ status = await window.__vibeWebMcp?.getStatus() || {}; }catch{}
    status.traffic_class = window.__jamflowTraffic?.traffic_class;
    status.lang = document.documentElement.lang.startsWith('en') ? 'en' : 'zh';
    $('feedbackDiagnostics').value = feedbackDiagnostics(status,window.__jamflowLastError);
  }
  $('feedbackOpen').onclick = async () => {
    translate();
    dialog.showModal();
    $('feedbackMessage').focus();
    await snapshot();
  };
  $('feedbackClose').onclick = () => dialog.close();
  $('feedbackInclude').onchange = () => {
    const include = $('feedbackInclude').checked;
    const field = $('feedbackContext');
    field.disabled = !include;
    field.hidden = !include;
    field.value = include ? feedbackContext($('intent').value,$('code').value) : '';
  };
  $('feedbackForm').onsubmit = () => {
    $('feedbackHandoff').hidden = false;
    // The provider's receipt, not opening a new tab, proves delivery.
  };
  new MutationObserver(() => { translate(); if(dialog.open) void snapshot(); }).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  translate();
}
