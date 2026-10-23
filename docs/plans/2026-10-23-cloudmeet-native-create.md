# CloudMeet Native Meeting Implementation Plan

**Goal:** Android 原生创建/加入接入与 Electron 相同的 CloudMeet API 和 Jitsi 服务。

**Approved architecture:** 保留原生视频会议，不改为 WebView；业务 API `/mapi` 与 Jitsi 根地址分开处理。首页提供独立创建入口和创建表单；输入已有九位会议号仅加入，不偷偷创建。默认连接官方 118 服务，显式自定义 Jitsi 地址保留原行为。

**Tasks:**
1. 编写业务流程单元测试：九位号/密钥生成、创建→令牌顺序、创建/鉴权失败禁止入会、已有会议校验。
2. 新建 `react/features/cloudmeet/meetingService.ts` 和原生入口适配；API 超时与业务错误显式显示，禁止匿名降级。
3. 首页新增创建表单及独立入口，加入路径调用 join-check；JWT 通过现有 URL 入会解析链路传递（不可写日志）。
4. 默认原生服务改为官方 Jitsi 根地址；Android 域级信任官方证书，校验指纹后导入，不全局关闭 HTTPS 校验。
5. 运行单元测试/ESLint/TypeScript 基线对比、Libre Release 构建和覆盖安装；实测单人创建及主持人身份，不将多人互通算作已通过。

**Security:** hostKey/JWT 是权限凭据，使用安全随机数；只发往官方 origin，不记录到日志，不持久化明文密钥。创建状态只保留进程内，失败允许使用相同凭据重试；重新打开应用不保证主持人恢复（后续需安全存储）。证书只限官方域名，保持 hostname/有效期校验。业务创建失败或 token 缺失立即停止，绝不退化为匿名主持人。

**Scope exclusions:** 不改服务器权限/部署，不改原有日历预定和历史同步，不推送远端。旧会议信息页功能不属于此修复。

## Verification progress

- 18 项 Node 测试通过（6 项 CloudMeet 流程测试 + 12 项原主题回归）。创建/令牌失败会阻止入会，令牌失败重试不重复创建记录。
- 新增/修改 TS 文件 ESLint 通过，Babel 编译通过；原生 TypeScript 相比既有基线无新增错误。
- 下载的官方证书 SHA-256 与 Electron `server-trust.js` 中的 `CC896427E1F03EA481BDE4D1A4102189E6988ED0C4671B00E44A0917BBFF4FF5` 完全一致；使用该证书作为信任源读取官方 config.js HTTP 200。
- 官方 join-check 只读校验探测返回 HTTP 200、业务码 40401、消息“会议不存在”；客户端须处理 HTTP 200 中的业务失败。
- 首次构建触发 120 秒工具超时，不能视为编译失败或成功；已扩大超时重新构建。APK 尚待此次构建结果及实机验收。
- 已保存其他服务器地址的用户不会被无条件迁移；无自定义设置时默认使用官方 Jitsi 根地址。

## Final device verification

- 首轮实机创建 HTTP 400：恢复凭据必须与 Web 一致，采用 32 字节 Base64URL（43 字符），原十六进制不兼容现网；已补回归断言。
- 第二轮业务创建/token 成功但 config.js 解析失败：Worklet 无 URLSearchParams/window。已在隔离解析 IIFE 内提供最小查询读取兼容层，空查询不会把 Web 专用主持菜单注入原生；角色仍由真实 JWT/XMPP 确认。新增 `scripts/tests/native-config.test.cjs` 先失败后通过。
- 最终 Libre Release 构建成功（1m43s），覆盖安装成功；20 项测试通过，ESLint 通过，最终 TypeScript 对比原基线新增诊断 0，diff check 通过。
- m66Pro Android 11 创建会议 `327451379`，预加入页面视频预览正常；为避免测试传送环境音视频，入会前关闭麦克风及摄像头。
- 14:15:56 原生日志确认 `Conference joined`；参会者列表显示 1 人及“主持人”，创建、JWT、配置加载、XMPP 入会全链路验收通过。测试后点击挂断离开。
- 证据（本机临时目录）：`cloudmeet-final-join.png`、`cloudmeet-inroom.png`、`cloudmeet-role.png`；过滤后的进程日志 `cloudmeet-success-log.txt`。
- 联调产生少量 AndroidTest 测试会议记录；未擅自删除服务端记录。多人音视频互通、已有加密会议加入、Android 15 未验收。
- 会议内浅色主题仍存在黑色工具栏/部分弱对比文字，是原主题适配未闭环项，不宣称已修复。
- 主持人密钥仅存于当前创建流程内，重启后主持身份恢复未实现；本次不将安全存储/服务端历史同步扩展进来。未推送 GitHub。
