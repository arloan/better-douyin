const KEY = 'douyinkit_settings';
const DEFAULTS = {
  quickBlock: true,
  stripEmojiSpaces: true,
  applyDefaults: true,
  defaultSpeed: 0,
  defaultResolution: 'Auto'
};

const ids = ['quickBlock', 'stripEmojiSpaces', 'applyDefaults', 'defaultResolution', 'defaultSpeed'];

function t(key) {
  return (chrome.i18n && chrome.i18n.getMessage && chrome.i18n.getMessage(key)) || key;
}

for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.getAttribute('data-i18n'));

function render(s) {
  for (const id of ids) {
    const el = document.getElementById(id);
    el.value = String(s[id]);
    if (el.type === 'checkbox') el.checked = !!s[id];
  }
}

function save() {
  const out = {};
  for (const id of ids) {
    const el = document.getElementById(id);
    out[id] = el.type === 'checkbox' ? el.checked : (el.tagName === 'SELECT' && ['defaultSpeed'].includes(id) ? Number(el.value) : el.value);
  }
  chrome.storage.local.set({ [KEY]: out });
}

chrome.storage.local.get([KEY], (res) => {
  render({ ...DEFAULTS, ...(res && res[KEY] ? res[KEY] : {}) });
});
for (const id of ids) document.getElementById(id).addEventListener('change', save);
