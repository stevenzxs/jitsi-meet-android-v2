# 会议浅色主题对比度修正

## 根因与改动

- 次要按钮旧 text04 实值 #040404 被通用颜色转换误当背景，导致浅底近白字。公共 Button 直接使用当前主题语义前景色，显式设置 Paper textColor 与标签颜色；主/危险实底按钮保留白字，禁用状态使用当前主题。
- 通过 NativeForegroundContext 让自定义按钮图标沿用按钮前景色；分组讨论室图标改用 Paper 传入的颜色。次要 IconButton 使用当前主题前景/背景。
- 参会者姓名使用 Paper Text 加静态白色样式，改为主题适配 Text。
- Android 原生通知补充 values-zh 标题、正文、操作及分类中文资源，保留默认英文资源。

## 验证

- 新增 5 项回归先失败再修复；完整 Node 回归 45/45 通过。
- 修改 TSX ESLint 通过；TypeScript 相较既有基线新增诊断 0；git diff --check 通过。
- Release 构建成功 2m25s，已覆盖安装 m66Pro，保留数据。
- 实机浅色：预定页次要按钮文字清晰；通过预定列表成功以主持身份入会；参会者姓名、全体静音、分组讨论室文字及图标清晰；离开会议深字浅底、结束全体会议白字红底；通知显示“会议进行中 / 你正在会议中，点击返回会议”。测试后点击离开会议。
- 截图位于 C:\Users\ZL\AppData\Local\Temp\opencode：contrast-participants.png、contrast-leave.png、contrast-notification.png。
- 举手按钮共用本次修复的次要按钮路径，自动回归已覆盖；本机更多菜单未显示截图中相同的举手面板，尚未完成该面板实机截图验收。深色及多人场景尚未重新实测，不宣称全量视觉验收通过。
- 未提交、未推送，保留既有工作区改动。
