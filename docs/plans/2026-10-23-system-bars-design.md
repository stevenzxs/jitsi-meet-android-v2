# 系统栏与主题图标补充设计及实施计划

已确认：顶部时间/电池栏、底部手势/三键导航栏跟随应用主题，主题选择改为太阳/月亮双图标，保留无障碍标签和持久化。

原生 Android 15 inset listener 当前写入固定深色 decor 背景。增加 SDK SystemTheme 模块，由主题 Provider 同步选择；原生统一应用窗口底色和两组系统图标明暗。监听 Activity 恢复，并在创建窗口及 inset 更新时恢复应用主题。保留现有边距及全屏行为，不改变系统全局主题、不重建 Activity。

步骤：
1. 增加系统栏桥接/图标回归检查，先运行确认失败。
2. 新建 `android/sdk/src/main/java/org/jitsi/meet/sdk/SystemThemeModule.java`，在 ReactHostHolder 注册；JitsiMeetActivity 的创建和 inset 回调使用当前主题。
3. `JitsiThemeProvider.native.tsx` 在主题变更时同步模块；`ThemeOption.tsx` 使用 react-native-svg 线条太阳/月亮，保持 48dp 触摸区域。
4. 执行 Node 测试、修改文件 ESLint、原生 TypeScript 基线对比和 Libre Release 构建。
5. 安装可连接设备并验证深浅色系统栏、前后台恢复，记录设备/Android 版本限制；不推送 GitHub。

## 构建前检查

- Node 检查 8/8 通过（其中两项为原生接线/组件结构静态检查，不替代系统栏实机测试）。
- 修改的主题 Provider/图标/选择项 ESLint 通过；Babel 转换通过。
- 原生 TypeScript 对比此前基线无新增诊断；`git diff --check` 通过。
- 当前设备 m66Pro，API 30（Android 11），手势导航模式 2。Android 15+ 路径需用户对应设备复核。

## 构建及实机结果

- Libre Release 离线构建成功（1m51s），覆盖安装成功，应用数据保留。
- 浅色：首页/设置顶部状态栏浅底深字，底部系统手势栏浅底深色手势条。
- 深色：顶部状态栏深底浅字，底部系统手势栏深底浅色手势条。
- 设置显示月亮/太阳矢量图标，点击分别切换深色/浅色，选中状态正常。
- 浅色切到系统桌面再返回，页面及上下系统栏仍保持浅色。
- ReactNativeJS/AndroidRuntime 错误日志过滤无输出。
- 证据：本机临时目录中的 `system-theme-settings.png`、`system-theme-dark.png`、`system-theme-resume.png`。
- Android 15+ 与三键导航未实测，不将其计为验收通过。未推送远端。
