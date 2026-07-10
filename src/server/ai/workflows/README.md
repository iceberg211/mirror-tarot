# Reading Workflow

纯 TypeScript 状态机，节点语义对齐 LangGraph：

```text
START → safety → build_context → (route 层 stream generate) → persist/telemetry → END
```

## 为何不直接用 LangGraph 流式节点

主解读是 **ReadableStream**。把 token 流塞进 graph 节点会增加复杂度且收益有限。  
因此：

- **生成前**：`runReadingWorkflow()`（safety + context + memory）
- **生成中**：现有 `createAITwoPhaseReadingStream` / `createAIChatStream`
- **生成后**：`recordAiGeneration` / action_items（fail-soft）

## 后续迁移到 LangGraph

可引入 `@langchain/langgraph`，将 `runReadingWorkflow` 拆为 `StateGraph` 节点，checkpointer 用于月报等可恢复任务。  
对外仍建议保持 `runReadingWorkflow(input) → result` 接口。
