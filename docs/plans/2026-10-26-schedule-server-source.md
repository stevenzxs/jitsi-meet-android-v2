# Android 预定会议服务端数据源修正

**Goal:** 正式预定列表与接口数据一致，本机只提供私有凭据；未确认创建不再通过预定列表缺席推断不存在。

**Architecture:** 查询使用持久化安装身份；服务端字段映射为独立展示模型，过滤关闭/过期记录并排序去重。本机待确认草稿独立区域；缺少本机密钥时禁止主持操作。失败保留已加载数据并提示，不覆盖为旧本机字段。

**Tech Stack:** React Native、TypeScript、Redux middleware、Node test runner。

## 执行步骤

1. 为服务端映射、身份过滤、过期边界、凭据隔离与列表接线添加失败测试；实现映射和正式列表/草稿分区。
2. 为丢失响应后 RUNNING/关闭/不存在/断网的确认添加失败测试；保留 API 错误码，使用本机密钥请求 host-token 确认，仅明确 40401 才重试创建。创建响应不作为凭据来源。
3. 为真实入会上报、非官方域名隔离和离会清理添加失败测试；在 CONFERENCE_JOINED 后启动上报，离会/失败停止。定期重报覆盖提前入会跨越计划开始时间，失败仅记录不含凭据的警告。
4. 运行 Node 回归、变更文件 lint、native TypeScript 检查及可用的 Android 构建；记录基线问题和未完成实机验收项。

## 范围边界

- 只改 D:\jm；D:\code\jitsi 只读，不改接口、不部署、不推送。
- 不新增账号身份共享、取消/邀请等额外功能；不把 creatorId 当授权。
- 正式预定仅展示 SCHEDULED 且服务端结束时间晚于当前时间的记录。RUNNING 不伪装成预定或历史。
- 待确认草稿不自动删除；关闭/过期可通过已验证密钥后的明确业务错误确认存在，但仍由入会接口拒绝进入。
- 验收包含接口有记录但本机无缓存、远端主题/时间变更、服务端空列表、失败保留、无密钥、已过期、重复记录和非本机身份。

## 验证结果

- `node --test scripts/tests/*.test.cjs`：97/97 通过。
- 6 个生产变更文件 ESLint：显式使用 `--parser-options '{"project":"./tsconfig.native.json"}'` 后通过。默认命令引用工作区缺失的 tsconfig.web.json。
- `npm run tsc:native`：113 个 TS2307，均来自既有 svg/constants.ts 的 SVG 声明缺失。通过 CompilerHost 在内存中还原所有已修改 TS 文件到 HEAD 后，得到同样 113 个错误、同一文件，未写入或回退工作区。
- `LIBRE_BUILD=true` 下 `gradlew.bat :app:assembleRelease --offline --console=plain`：BUILD SUCCESSFUL；日志确认 :sdk:bundleReleaseJsAndAssets 重新写入 bundle。
- APK：`android/app/build/outputs/apk/release/app-release.apk`。默认非 Libre 离线构建缺少 Firebase 缓存；未更改持久构建配置。
- `git diff --check` 通过。未部署、推送或安装到手机；实机展示、真实接口状态切换、后台定时器恢复、断网重试仍需验收。
- 上报只在真实 CONFERENCE_JOINED 后启动，每 30 秒重报，离会或失败停止；不记录 URL/JWT/密钥。
- 列表失败保留当前组件已加载的服务端数据，不将本机旧字段伪装成服务端结果；重新挂载且断网时正式列表可能为空并显示错误。
