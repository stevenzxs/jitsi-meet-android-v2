# 历史会议过期状态修正

## 已确认范围

用户要求以接口为准，执行会议 551359704 排查后的修正。排查时线上 join-check 返回业务码 40902（会议已过期）；未取得该安装身份完整历史响应，不假定实际计划时间，也不修改数据库。

- API 原始 status、endedAt 保留不变。CANCELLED、ENDED 优先，未知状态不猜测。
- 仅当 RUNNING/SCHEDULED 的 API scheduledEndTime 是有效时间且已到期时，派生展示状态 EXPIRED（已过期）。不是伪造服务端 ENDED，也不是实际结束时间。
- 状态文案、进行中高亮、点击行为共用判断；到期定时重绘，AppState 恢复前台时重新核对时间，点击时实时重查。
- 未过期 RUNNING 入会前使用现有 joinMeeting/join-check；业务拒绝或断网不导航，不再直接拼 URL。当前历史无密码输入入口，密码会议校验失败时保留接口提示。
- 无效或缺失结束时间不推算过期；进入许可仍由接口决定。

## 验证

- 先添加回归并确认 3 项失败，再实现；全套 `node --test scripts/tests/*.test.cjs` 105/105 通过。
- 新回归包含到期前/边界/后、关闭状态优先、未知状态、缺失时间、原始字段不变及 UI 接线；UI 接线为源码/Babel 检查，不等同于实机行为测试。
- 两个生产变更文件 native ESLint 通过，git diff --check 通过。
- `npm run tsc:native` 仍为已有 SVG constants.ts 的 113 个 TS2307，无其它文件错误。
- Libre 离线 Release 构建成功；APK `android/app/build/outputs/apk/release/app-release.apk`。
- 构建日志：`C:\Users\ZL\AppData\Local\Temp\opencode\jm-history-expiry-release.log`。
- 未安装手机、未实机验收、未部署、未提交或推送。时间展示依赖设备时钟与接口计划截止时间；服务端 join-check 为最终入会授权判断。
