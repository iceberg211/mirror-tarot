<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 前端开发规范 (Frontend Development Guidelines)

在进行本项目的 React / Next.js 前端开发时，必须始终严守以下两点原则：

1. ✦ **组件化 (Componentization)** ✦
   - 避免创建庞大冗长、堆叠数千行 UI 的单页面文件。应根据业务职责，合理将 UI 拆分为低耦合、高内聚的子组件。
   - 子组件应保持单一职责，接口设计（Props）简洁明了，并在适当时使用 `memo` 优化重绘性能。

2. ✦ **逻辑 Hooks 化 (Custom Hooks Extraction)** ✦
   - 杜绝在主页面或大 UI 组件内混入过于复杂的交互逻辑、数据请求、事件调度或特效计算代码。
   - 将所有核心的状态变化与底层能力封装为**自定义 React Hooks**（如音频管理封装为 `useAudio`，动画或数据持久化等同理），使前端组件只专注于“描述 UI 渲染”与“组装子组件”，实现“业务逻辑与视图展现”的纯净分离。
