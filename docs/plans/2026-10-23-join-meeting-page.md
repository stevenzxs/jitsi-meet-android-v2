# Join Meeting Page Implementation Plan

**Goal:** 将首页会议号和密码表单迁移到独立加入会议页。

**Architecture:** 复用快速会议页面的根 Stack、主题和 200ms opacity-only 过渡；新页调用既有 joinMeeting 后 appNavigate，不覆盖 prejoin。首页 CloudMeet 模式仅显示快速会议/加入会议入口，设置页隐藏入口；非 CloudMeet 及历史记录行为不变。

**Tech Stack:** React Native、React Navigation、Redux、Node test。

1. 在 scripts/tests/join-meeting-page.test.cjs 添加失败回归：路由/过渡、首页入口及旧表单隐藏、新页校验和原有业务链路。
2. 新增 react/features/cloudmeet/JoinMeetingPage.native.tsx：居中标题/取消、两个输入框、重复提交锁、失败保留输入、请求中禁止退出，成功恢复退出能力后导航。
3. 修改 mobile/navigation/routes.ts 和 RootNavigationContainer.tsx 注册新页并复用快速会议动画；WelcomePage.native.tsx 添加加入入口，仅非 CloudMeet 保留旧内联表单。
4. 运行 Node 回归、修改 TS 文件 ESLint、TypeScript 基线对比和 git diff --check；构建 Release、覆盖安装。
5. 实机验证入口、设置隐藏、取消/返回、重新进入清空、校验提示和深浅主题；服务端不可用时明确无法验收真实入会。不提交或推送现有未提交改动。

## 验证结果

- 新回归先失败后通过；32 项 Node 检查通过，修改 TS 文件 ESLint 通过，TypeScript 对比既有基线新增诊断 0，git diff --check 通过。
- Libre Release 构建成功（1m48s），Android 11 m66Pro 覆盖安装成功。
- 实机确认首页两个入口、旧表单/提示移除；加入页居中标题/取消/两个输入框；空会议号禁用；输入 123 提示九位校验并保留内容；取消返回，重新进入清空；设置页无两个入口；深浅加入页及 Android 返回正常。测试后恢复浅色首页。
- 本轮未提交有效会议号，不宣称真实入会或密码会议端到端已验证；透明度过渡源码检查通过，未逐帧验收。未提交或推送。
