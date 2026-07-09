/* ===== GTA Online Career Lookup — HQSHI API wrapper (main process) ===== */
const { app } = require('electron');

const DEFAULT_EXPIRE = 2592000;
const BASE = 'https://api.hqshi.cn';

async function queryCareer(nickname, opts) {
  const expire = (opts && opts.expire) || DEFAULT_EXPIRE;
  const url = BASE + '/api/recent?nickname=' + encodeURIComponent(nickname) + '&expire=' + expire + '&type=json';
  const ctrl = new AbortController();
  const t = setTimeout(function () { ctrl.abort(); }, 12000);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'VaultGTA/' + app.getVersion() }
    });
    const text = await r.text();
    if (!text || !text.trim()) {
      return { success: false, error: 'empty', hint: 'HQSHI 暂无此玩家数据，可点击下方按钮请求生成' };
    }
    const json = JSON.parse(text);
    if (!json.payload || !json.body) {
      return { success: false, error: 'empty', hint: 'HQSHI 暂无此玩家数据，可点击下方按钮请求生成' };
    }
    return { success: true, data: json.body };
  } catch (e) {
    if (e.name === 'AbortError') return { success: false, error: 'timeout', hint: '请求超时（12秒），请重试' };
    return { success: false, error: e.message };
  } finally {
    clearTimeout(t);
  }
}

async function requestSnapshot(nickname, platform) {
  const url = BASE + '/api/post?nickname=' + encodeURIComponent(nickname) + '&platform=' + (platform || 'pcalt');
  const ctrl = new AbortController();
  const t = setTimeout(function () { ctrl.abort(); }, 15000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'VaultGTA' } });
    const data = await r.json();
    return { success: true, data: data };
  } catch (e) {
    if (e.name === 'AbortError') return { success: false, error: 'timeout', hint: '请求超时' };
    return { success: false, error: e.message };
  } finally {
    clearTimeout(t);
  }
}

module.exports = { queryCareer, requestSnapshot };
