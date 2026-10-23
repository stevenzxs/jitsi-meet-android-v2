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
