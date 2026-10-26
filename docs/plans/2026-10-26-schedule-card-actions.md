# 预定卡片操作实施方案

用户已确认：正式卡片展示“进入 / 复制邀请 / 取消”；待确认草稿不增加新操作。

1. 先添加邀请内容、密码未知、敏感字段隔离、DELETE 空响应/错误/无密钥、取消成功前后与旧刷新竞态测试。
2. 增加独立 scheduleActions.ts：邀请中转链接固定官方 /cm/invite，不含密码/JWT/管理密钥；取消只发 X-Host-Key，15 秒超时，业务错误显式抛出。
3. 卡片三个按钮支持换行。进入仅改文案；复制显示短暂“已复制”；取消二次确认、串行操作，成功后加入组件级已取消集合，所有刷新结果排除该集合，失败不移除。本机凭据保留给历史管理。
4. 跑全部 Node 回归、变更文件 native ESLint、native 类型检查及 Libre Release 构建；不改参考项目、不部署、不安装手机。

## 验证记录

- 先运行新增测试，6 项因缺少实现失败；实现后新增 6 项及全部 103 项 Node 测试通过。
- `npx eslint --parser-options '{"project":"./tsconfig.native.json"}' react/features/cloudmeet/ScheduledMeetings.native.tsx react/features/cloudmeet/scheduleActions.ts` 通过。
- `npm run tsc:native` 仍只有原有 svg/constants.ts 的 113 个 TS2307，其他文件错误为 0。
- `LIBRE_BUILD=true`、`:app:assembleRelease --offline --console=plain` 构建成功，重新打包 JS。APK：`android/app/build/outputs/apk/release/app-release.apk`。
- `git diff --check` 通过。未修改参考项目、未安装手机、未部署或推送。
- 尚需实机验收：窄屏/大字体换行、明暗主题、剪贴板内容、取消弹窗与真实接口结果、历史页已取消状态。
- 已取消集合仅属于当前组件，处理本页旧请求回写；重新挂载后依赖服务端 CANCELLED 过滤，不删除本机私有凭据。
