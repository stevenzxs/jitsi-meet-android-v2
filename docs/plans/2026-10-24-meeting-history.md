# 首页会议导航与历史信息实施计划

目标：预定会议优先；历史列表展示真实主题、会议号、状态、实际开始时间及整场时长。

设计：保留原有 RecentList 本机列表、导航和长按删除行为，以可选元数据扩展显示，不额外插入无法本机删除的服务端条目。CloudMeet 首页通过聚焦刷新读取安装身份对应的 visible/history 接口，合并去重，不发起无 creatorId 的全量查询。只信任 startedAt/endedAt，不以预约时间或本机参会时长替代。请求失败保留上次元数据并显示错误。新快速会议绑定同一安装身份，过去未绑定身份的快速会议及他人创建的会议无元数据时明确兜底。

1. 添加 service 单测，覆盖身份为空、响应异常、实际时间、未知字段和去重；先运行失败，再实现 historyService.ts。
2. 默认 calendar 标签并交换 JSX 顺序，保留非 CloudMeet 行为，添加导航回归检查。
3. 新建 HistoryMeetings.native.tsx 负责聚焦刷新、并发保护、错误展示；RecentList 接收可选元数据和刷新回调，保留入会和长按。
4. 历史格式化函数使用实际时间计算总时长；缺失数据明确兜底。
5. 执行 node --test scripts/tests/*.test.cjs、修改文件 ESLint、git diff --check 和 Babel 编译检查。

本次不自动提交、打包或安装；保留此前未提交的刷新色和返回箭头修复。
