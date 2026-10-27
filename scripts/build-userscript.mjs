import { readFileSync, writeFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const injected = read('extension/injected.js');
const content = read('extension/content.js');
const extraction = injected.slice(injected.indexOf('  function collectionModels'), injected.indexOf('  // ── Escuta pedidos'))
  .replaceAll('window.require', 'unsafeWindow.require')
  .replace('raw instanceof Blob', "Object.prototype.toString.call(raw) === '[object Blob]'");
const wrapper = content.slice(content.indexOf('function getResultWrapper'), content.indexOf('\nfunction addTranscribeBtn'));
const result = content.slice(content.indexOf('function showResult'), content.indexOf('// ── 5.'))
  .replace('navigator.clipboard.writeText(text)', 'GM_setClipboard(text)');
const detection = content.slice(content.indexOf('function isAudioMessage'), content.indexOf('function scanForAudioMessages'));
const css = read('extension/styles.css');
const header = `// ==UserScript==
// @name         WATranscribe — WhatsApp em texto
// @namespace    https://github.com/ArielRSousa/WATranscribe
// @version      3.0.5.1
// @description  Transcreva áudios do WhatsApp Web com um clique, sem login adicional.
// @author       Ariel Sousa
// @match        https://web.whatsapp.com/*
// @run-at       document-idle
// @noframes
// @sandbox      JavaScript
// @grant        unsafeWindow
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @connect      watranscribe-api.vercel.app
// @homepageURL  https://github.com/ArielRSousa/WATranscribe
// @supportURL   https://github.com/ArielRSousa/WATranscribe/issues
// @downloadURL  https://watranscribe-api.vercel.app/watranscribe.user.js
// @updateURL    https://watranscribe-api.vercel.app/watranscribe.user.js
// @license      MIT
// ==/UserScript==
`;
const runtime = read('userscripts/runtime.js');
const bundle = header + '\n(function () {\n\'use strict\';\nGM_addStyle(' + JSON.stringify(css) + ');\n' + extraction + '\n' + detection + wrapper + result + runtime + '\n})();\n';
for (const path of ['userscripts/watranscribe.user.js', 'server/public/watranscribe.user.js']) {
  writeFileSync(new URL(`../${path}`, import.meta.url), bundle);
}
console.log('Userscript gerado em userscripts/ e server/public/.');
