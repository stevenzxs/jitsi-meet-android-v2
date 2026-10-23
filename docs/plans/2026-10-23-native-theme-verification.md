# Android 主题验证记录

## 自动检查

- `node --test scripts/tests/native-theme.test.cjs`：6/6 通过。
- 修改及新增 TypeScript 文件 ESLint：通过，显式使用 `tsconfig.native.json`。
- 原生 TypeScript：与实施前基线对比，无新增诊断；完整检查仍因原有 SVG 声明等问题失败，不能标记为整体通过。
- 62 个语言 JSON：解析通过。
- `git diff --check`：通过。
- 首次 Release 构建遇到 Babel `declare context` 字段不兼容；已移除新增声明，改为读取处类型断言，并加入实际 Babel 配置的编译回归测试。
- 修复后 Libre Release 离线构建成功；状态栏适配后的最终构建也成功（1m41s），已覆盖安装并启动。

## 实机证据（m66Pro）

设备：`YYT636426071701017`，包名：`org.jitsi.meet`。
覆盖安装成功，未清除应用数据。

1. 设置页默认深色，主题入口及两项中文标签正常显示。
2. 点击浅色后同页立即变更，布局及原有设置不变。
3. 强制停止并重新启动：浅色恢复，首页文字与输入框可读。
4. 浅色语言子页：背景、语言文字、返回导航可读。

截图保存在本机临时目录 `C:\Users\ZL\AppData\Local\Temp\opencode\`：
`theme-dark.png`、`theme-light.png`、`theme-restart.png`、`theme-language.png`。
以上四张截图来自状态栏修复之前的安装版本。最终版本截图 `theme-final.png`
确认浅色首页及状态栏已适配；过滤 ReactNativeJS/AndroidRuntime 错误日志无输出。

## 尚未验收

- 多人会议、聊天/会议弹窗、摄像头关闭、屏幕共享及横竖屏场景。
- 原生 RTCView 不同宽高比的实际留白；仅调整背景容器不能证明视频渲染层全部跟随。
- 会议中切换时是否保持音视频轨道和会话连续，需要真实会议验证。

因此本次状态是已实现且基础页面验证通过，尚不能宣称全应用/视频画布适配已全部验收。
代码保留在 `feature/native-themes`，未推送远端。
