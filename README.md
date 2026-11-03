# 抖音精灵 / Better Douyin

（原项目代号 douyinkit；扩展显示名支持多语言，见下）

抖音 Web 版（www.douyin.com）增强 Chrome 扩展（Manifest V3）。

## 功能

1. **快速拉黑**：视频流里鼠标悬停到博主头像，右上角出现 🚫 小按钮，点击后弹出确认框，确认即拉黑（走抖音官方接口 `POST /aweme/v1/web/user/block/`，无需进主页点"…"菜单）。
2. **评论表情去空格**：插入官方表情时抖音会自动写成 `" [微笑] "`（前后各一个空格），本扩展会自动校正为 `[微笑]`。
3. **默认清晰度 / 倍速**：在扩展弹窗里设置后自动应用，不用每次手动点。
   - 倍速：直接写抖音自己的存储键 `sessionStorage.player_playbackratio`（数字）。
   - 清晰度：抖音把当前档位存在 `sessionStorage.MANUAL_SWITCH`（JSON），但每次页面挂载都会把它清掉，所以扩展用主世界脚本（`inject.js`，`document_start`）拦住这次清空并写回设定档位，抖音自己的播放器逻辑随后就会采纳。档位常量取自抖音的映射表：`Auto:0 / Hd:1 / Clear:2 / Smooth:3 / Fast:4`。
   - 注意：不是所有视频都提供全部档位，视频没有对应流时抖音会回退。

## 安装

1. 打开 `chrome://extensions`，开启右上角"开发者模式"。
2. 点"加载已解压的扩展程序"，选择本仓库的 `extension/` 目录。
3. 刷新已打开的抖音页面。

## 使用说明

- 拉黑按钮默认悬停头像时显示；确认框支持 Esc / 点击遮罩取消。
- 表情去空格只在官方表情面板点击表情时生效；含 @ 提及时不重写，避免破坏提及实体。
- 默认清晰度/倍速对已渲染的视频卡片不追溯，切换视频或刷新后生效。
- 设置保存在 `chrome.storage.local`，弹窗里改动即时生效。

## 目录

- `extension/_locales/` — 多语言文案（`zh_CN` 默认、`en`），名称/描述/弹窗/对话框均已接入
- `extension/manifest.json` — MV3 清单
- `extension/content.js` — 全部功能逻辑
- `extension/inject.js` — 主世界注入脚本，负责默认清晰度的存储拦截
- `extension/popup.html` / `popup.js` — 设置弹窗
