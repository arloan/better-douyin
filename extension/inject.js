/*!
 * 抖音精灵 —— 主世界注入脚本（默认清晰度）
 *
 * 抖音网页版的清晰度选择器把"当前档位"存在 sessionStorage.MANUAL_SWITCH（JSON），
 * 但它在每次页面挂载时都会 removeItem 把它清掉，所以扩展直接预写是无效的。
 * 这里在主世界拦住这次清空：一旦被清掉就立刻把扩展设定的默认档位写回去，
 * 抖音自己的播放器逻辑（用 MANUAL_SWITCH.gearType 选码率、用 gearClarity 匹配档位）随后就会采纳它。
 *
 * 档位常量取自抖音自己的映射表（webpack 模块 515205）：
 *   gearType(EA)     Auto:0  Hd:1  Clear:2  Smooth:3  Fast:4
 *   gearClarity(hq)  Auto:"0"  Hd:"5"  Clear:"4"  Smooth:"3"  Fast:"2"
 * 期望值由内容脚本写在 localStorage 镜像键里；选"智能"时镜像为空，本脚本不做任何事。
 */
(() => {
  'use strict';

  if (window.__douyinkitInjected) return;
  window.__douyinkitInjected = true;

  const KEY = 'MANUAL_SWITCH';
  const MIRROR = 'douyinkit_res';

  const proto = Storage.prototype;
  const origSet = proto.setItem;
  const origRemove = proto.removeItem;
  const origClear = proto.clear;

  const payload = () => {
    try { return localStorage.getItem(MIRROR) || ''; } catch (e) { return ''; }
  };

  const apply = () => {
    const p = payload();
    if (p) origSet.call(sessionStorage, KEY, p);
  };

  proto.removeItem = function (k) {
    const r = origRemove.call(this, k);
    if (this === sessionStorage && k === KEY) apply();
    return r;
  };

  proto.clear = function () {
    const r = origClear.call(this);
    if (this === sessionStorage) apply();
    return r;
  };

  // 改设置后无需刷新即可对后续视频生效
  window.addEventListener('message', (e) => {
    if (!e || e.source !== window) return;
    const d = e.data;
    if (!d || d.__douyinkit !== 'res') return;
    if (d.value) origSet.call(sessionStorage, KEY, d.value);
    else origRemove.call(sessionStorage, KEY);
  });

  apply();
})();
