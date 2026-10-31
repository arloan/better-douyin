/*!
 * douyinkit — 抖音 Web 增强
 *  1. 视频页头像旁一键拉黑（带确认对话框）
 *  2. 评论插入官方表情时去掉自动附加的前后空格
 *  3. 默认播放清晰度 / 倍速
 */
(() => {
  'use strict';

  if (window.__douyinkit_loaded) return;
  window.__douyinkit_loaded = true;

  const SETTINGS_KEY = 'douyinkit_settings';

  const DEFAULTS = {
    quickBlock: true,
    stripEmojiSpaces: true,
    applyDefaults: true,
    defaultSpeed: 0,          // 0 = 不干预
    defaultResolution: '自动' // 自动 | 高清 1080P | 高清 720P | 标清 540P | 极速
  };

  let settings = { ...DEFAULTS };

  chrome.storage.local.get([SETTINGS_KEY], (res) => {
    if (res && res[SETTINGS_KEY]) settings = { ...DEFAULTS, ...res[SETTINGS_KEY] };
    applyPlayerDefaults();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[SETTINGS_KEY]) {
      settings = { ...DEFAULTS, ...(changes[SETTINGS_KEY].newValue || {}) };
      applyPlayerDefaults();
    }
  });

  /* ------------------------------------------------------------------ *
   * 3. 默认清晰度 / 倍速
   * ------------------------------------------------------------------ */

  // 抖音自身使用 sessionStorage.player_playbackratio 保存倍速（数字）
  // 以及 localStorage.playerResolution = "<key>,<过期毫秒>"（逗号分隔，非 JSON）
  function applyPlayerDefaults() {
    if (!settings.applyDefaults) return;
    try {
      const speed = Number(settings.defaultSpeed) || 0;
      if (speed > 0) sessionStorage.setItem('player_playbackratio', String(speed));

      const res = settings.defaultResolution || '自动';
      if (res === '自动') {
        // 抖音把"自动"当作未设置处理，直接清空即可
        localStorage.removeItem('playerResolution');
      } else {
        // 抖音原生格式：localStorage.playerResolution = "<显示名>,<过期毫秒>"
        const expire = Date.now() + 365 * 24 * 3600 * 1000;
        localStorage.setItem('playerResolution', `${res},${expire}`);
      }
    } catch (e) {
      /* 隐私模式下 storage 可能抛错，忽略 */
    }
  }

  /* ------------------------------------------------------------------ *
   * 1. 快速拉黑
   * ------------------------------------------------------------------ */

  const STYLE = `
.dyk-block-btn{
  position:absolute; z-index:2147483000;
  width:22px; height:22px; padding:0; margin:0;
  display:none; align-items:center; justify-content:center;
  border:none; border-radius:50%; cursor:pointer;
  background:rgba(0,0,0,.55); color:#fff;
  box-shadow:0 1px 4px rgba(0,0,0,.45);
  backdrop-filter:blur(2px);
  transition:background .15s ease, transform .15s ease;
}
.dyk-block-btn svg{width:14px;height:14px;display:block;pointer-events:none}
.dyk-block-btn:hover{background:#fe2c55;transform:scale(1.12)}
[data-e2e="feed-item"]:hover .dyk-block-btn,
[data-e2e="video-avatar"]:hover .dyk-block-btn,
.dyk-block-btn:hover{display:flex}
.dyk-block-btn.dyk-on{display:flex}
.dyk-block-btn.dyk-done{background:#20c997}
.dyk-overlay{
  position:fixed; inset:0; z-index:2147483100;
  background:rgba(0,0,0,.45);
  display:flex; align-items:center; justify-content:center;
}
.dyk-dialog{
  min-width:320px; max-width:420px; padding:22px 24px 18px;
  background:#fff; border-radius:12px; color:#161823;
  font-size:14px; line-height:1.6;
  box-shadow:0 12px 40px rgba(0,0,0,.28);
}
.dark .dyk-dialog,.dtd-semi-dark .dyk-dialog{background:#1c1e27;color:#f2f3f5}
.dyk-dialog h3{margin:0 0 8px;font-size:16px;font-weight:600}
.dyk-dialog p{margin:0 0 18px;color:#68707f}
.dark .dyk-dialog p,.dtd-semi-dark .dyk-dialog p{color:#a6a9b8}
.dyk-dialog .dyk-who{font-weight:600;color:#161823}
.dark .dyk-dialog .dyk-who,.dtd-semi-dark .dyk-dialog .dyk-who{color:#f2f3f5}
.dyk-actions{display:flex;justify-content:flex-end;gap:10px}
.dyk-btn{
  padding:6px 18px;border-radius:6px;border:1px solid #e3e5e8;
  background:#fff;color:#161823;font-size:14px;cursor:pointer;
}
.dark .dyk-btn,.dtd-semi-dark .dyk-btn{background:#2f3140;border-color:#45475a;color:#f2f3f5}
.dyk-btn.dyk-primary{background:#fe2c55;border-color:#fe2c55;color:#fff}
.dyk-btn:disabled{opacity:.6;cursor:not-allowed}
.dyk-toast{
  position:fixed;left:50%;bottom:120px;transform:translateX(-50%);
  z-index:2147483200;padding:10px 18px;border-radius:8px;
  background:rgba(0,0,0,.82);color:#fff;font-size:14px;
  box-shadow:0 6px 20px rgba(0,0,0,.3);
}
`;

  function injectStyle() {
    if (document.getElementById('dyk-style')) return;
    const el = document.createElement('style');
    el.id = 'dyk-style';
    el.textContent = STYLE;
    (document.head || document.documentElement).appendChild(el);
  }

  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><line x1="5.6" y1="5.6" x2="18.4" y2="18.4"/></svg>';

  function toast(msg) {
    const el = document.createElement('div');
    el.className = 'dyk-toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function confirmDialog(nickname) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'dyk-overlay';
      overlay.innerHTML = `
        <div class="dyk-dialog">
          <h3>确认拉黑？</h3>
          <p>拉黑后 <span class="dyk-who">${esc(nickname) || '该博主'}</span> 将无法搜索到你，也不能给你发私信。</p>
          <div class="dyk-actions">
            <button class="dyk-btn" data-act="cancel">取消</button>
            <button class="dyk-btn dyk-primary" data-act="ok">确认拉黑</button>
          </div>
        </div>`;
      const done = (v) => { overlay.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
      const onKey = (e) => { if (e.key === 'Escape') done(false); };
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) return done(false);
        const act = e.target.getAttribute && e.target.getAttribute('data-act');
        if (act === 'ok') done(true);
        if (act === 'cancel') done(false);
      });
      document.addEventListener('keydown', onKey);
      document.body.appendChild(overlay);
    });
  }

  const COMMON_QUERY = 'device_platform=webapp&aid=6383&channel=channel_pc_web';

  async function resolveUserId(secUid) {
    const url = `https://www.douyin.com/aweme/v1/web/user/profile/other/?${COMMON_QUERY}&sec_user_id=${encodeURIComponent(secUid)}&source=channel_pc_web`;
    const res = await fetch(url, { credentials: 'include' });
    const data = await res.json();
    const uid = data && data.user && data.user.uid;
    return uid || '';
  }

  async function blockUser(secUid, userId) {
    const body = new URLSearchParams({
      user_id: userId || '',
      sec_user_id: secUid,
      block_type: '1',
      source: 'im'
    });
    const res = await fetch(`https://www.douyin.com/aweme/v1/web/user/block/?${COMMON_QUERY}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'x-secsdk-csrf-token': 'DOWNGRADE'
      },
      body: body.toString()
    });
    const data = await res.json();
    return data && data.status_code === 0 && (data.block_status === 1 || data.block_status === '1');
  }

  async function handleBlockClick(btn) {
    const secUid = btn.dataset.dykSec;
    if (!secUid) return toast('未识别到博主，无法拉黑');
    btn.classList.add('dyk-on');
    if (!(await confirmDialog(btn.dataset.dykName))) {
      btn.classList.remove('dyk-on');
      return;
    }
    try {
      const uid = await resolveUserId(secUid);
      const ok = await blockUser(secUid, uid);
      if (ok) {
        btn.classList.add('dyk-done');
        toast('已拉黑');
        setTimeout(() => btn.classList.remove('dyk-on', 'dyk-done'), 3000);
      } else {
        btn.classList.remove('dyk-on');
        toast('拉黑失败，请稍后重试');
      }
    } catch (e) {
      btn.classList.remove('dyk-on');
      toast('拉黑失败，请稍后重试');
    }
  }

  function decorateAvatar(avatar) {
    if (avatar.querySelector(':scope > .dyk-block-btn')) return;
    const host = avatar.closest('[data-e2e="feed-item"]') || avatar;
    const link = host.matches && host.matches('a[href*="/user/"]') ? host : host.querySelector('a[href*="/user/"]');
    let sec = '';
    if (link) {
      const href = link.getAttribute('href') || '';
      const m = href.split('/user/')[1];
      if (m && m !== 'self') sec = decodeURIComponent(m.split('?')[0]);
    }
    if (!sec) return;

    const nicknameEl = host.querySelector('[data-e2e="feed-video-nickname"]');

    avatar.style.position = 'relative';
    const btn = document.createElement('button');
    btn.className = 'dyk-block-btn';
    btn.type = 'button';
    btn.title = '拉黑该博主';
    btn.innerHTML = ICON;
    btn.dataset.dykSec = sec;
    btn.dataset.dykName = (nicknameEl && nicknameEl.textContent.trim()) || '';
    btn.style.top = '-2px';
    btn.style.right = '-2px';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleBlockClick(btn);
    }, true);
    avatar.appendChild(btn);
  }

  function scanForAvatars(root) {
    if (!settings.quickBlock) return;
    const nodes = (root && root.querySelectorAll) ? root.querySelectorAll('[data-e2e="video-avatar"]') : [];
    for (const el of nodes) decorateAvatar(el);
  }

  /* ------------------------------------------------------------------ *
   * 2. 评论表情去空格
   * ------------------------------------------------------------------ */

  // 抖音官方表情面板是 portal，插入走内部模型（不触发 beforeinput），
  // 且插入的文本自带前后空格（" [微笑] "）。这里在点击表情后校正：
  // 若本次插入新增的正是 " [表情] "，则用 insertText 重写为不带空格的版本。
  // 记住最近聚焦过的评论编辑器（点击表情图标时焦点可能已离开编辑器）
  let lastCommentEditor = null;

  document.addEventListener('focusin', (e) => {
    const t = e.target;
    if (t && t.getAttribute && t.getAttribute('contenteditable') === 'true' &&
        t.closest && t.closest('.comment-input-inner-container')) {
      lastCommentEditor = t;
    }
  }, true);

  function activeCommentEditor() {
    const ae = document.activeElement;
    if (ae && ae.getAttribute && ae.getAttribute('contenteditable') === 'true' &&
        ae.closest && ae.closest('.comment-input-inner-container')) {
      return ae;
    }
    return lastCommentEditor;
  }

  function isEmojiPanelImg(img) {
    // 表情面板是一个包含大量表情图标的网格
    let p = img;
    for (let d = 0; p && d < 6; d++, p = p.parentElement) {
      if (p.querySelectorAll && p.querySelectorAll('img').length >= 10) return true;
    }
    return false;
  }

  const EMOJI_SPACED = / (\[[^\[\]]{1,8}\]) /g;

  document.addEventListener('click', (e) => {
    if (!settings.stripEmojiSpaces) return;
    const img = e.target && e.target.closest ? e.target.closest('img') : null;
    if (!img || !isEmojiPanelImg(img)) return;
    const editor = activeCommentEditor();
    if (!editor) return;

    const before = editor.textContent || '';
    // 让抖音先完成插入，再校正
    setTimeout(() => {
      const after = editor.textContent || '';
      if (after === before) return;                    // 抖音没插入（可能面板关了）
      const fixed = after.replace(EMOJI_SPACED, '$1');
      if (fixed === after) return;                    // 本次插入没带多余空格
      if (before.includes('@') || after.includes('@')) return; // 有 @ 提及实体，不重写，交回抖音
      try {
        editor.focus();
        document.execCommand('selectAll', false);
        document.execCommand('insertText', false, fixed);
        document.getSelection().collapseToEnd();      // 光标放回末尾，方便继续输入
      } catch (err) {
        /* ignore */
      }
    }, 80);
  }, true);

  /* ------------------------------------------------------------------ *
   * 观察 DOM 变化，给新渲染的头像挂按钮
   * ------------------------------------------------------------------ */

  function start() {
    injectStyle();
    applyPlayerDefaults();
    scanForAvatars(document);
    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        for (const n of m.addedNodes) {
          if (n.nodeType !== 1) continue;
          if (n.matches && n.matches('[data-e2e="video-avatar"]')) decorateAvatar(n);
          scanForAvatars(n);
        }
      }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
