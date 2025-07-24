# Spec Workflow MCP 服务使用示例

本文档展示如何使用 Spec Workflow MCP 服务来指导AI模型按照结构化流程处理开发需求。

## 基本工作流程

### 1. 开始需求收集阶段

```json
{
  "tool": "spec_workflow",
  "arguments": {
    "stage": "requirements",
    "featureName": "user-authentication",
    "action": "start"
  }
}
```

**响应示例**:
```json
{
  "currentStage": "requirements",
  "featureName": "user-authentication",
  "requirementsApproved": false,
  "stageGuidance": "📋 REQUIREMENTS GATHERING STAGE\n\n...",
  "canProceed": false
}
```

此时AI模型应该：
1. 创建 `.specs/user-authentication/requirements.md` 文件
2. 生成EARS格式的需求文档
3. 使用 `userInput` 工具请求用户批准

### 2. 批准需求文档

```json
{
  "tool": "spec_workflow", 
  "arguments": {
    "stage": "requirements",
    "action": "approve"
  }
}
```

**响应示例**:
```json
{
  "currentStage": "requirements",
  "requirementsApproved": true,
  "canProceed": true,
  "nextInstructions": "After user approves requirements, transition to 'design' stage"
}
```

### 3. 进入设计阶段

```json
{
  "tool": "spec_workflow",
  "arguments": {
    "stage": "design",
    "action": "start"
  }
}
```

**响应示例**:
```json
{
  "currentStage": "design",
  "requirementsApproved": true,
  "designApproved": false,
  "stageGuidance": "🎨 DESIGN DOCUMENT CREATION STAGE\n\n...",
  "canProceed": false
}
```

此时AI模型应该：
1. 创建 `.specs/user-authentication/design.md` 文件
2. 进行必要的研究
3. 创建详细的技术设计文档
4. 使用 `userInput` 工具请求用户批准

### 4. 修订设计文档（如果需要）

```json
{
  "tool": "spec_workflow",
  "arguments": {
    "stage": "design", 
    "action": "revise",
    "feedback": "需要添加更详细的错误处理策略"
  }
}
```

### 5. 批准设计文档

```json
{
  "tool": "spec_workflow",
  "arguments": {
    "stage": "design",
    "action": "approve"
  }
}
```

### 6. 进入实现计划阶段

```json
{
  "tool": "spec_workflow",
  "arguments": {
    "stage": "implementation",
    "action": "start"
  }
}
```

**响应示例**:
```json
{
  "currentStage": "implementation",
  "designApproved": true,
  "tasksApproved": false,
  "stageGuidance": "⚡ IMPLEMENTATION PLANNING STAGE\n\n...",
  "canProceed": false
}
```

此时AI模型应该：
1. 创建 `.specs/user-authentication/tasks.md` 文件
2. 生成可执行的编码任务清单
3. 使用 `userInput` 工具请求用户批准

### 7. 批准任务清单并完成工作流

```json
{
  "tool": "spec_workflow",
  "arguments": {
    "stage": "implementation",
    "action": "approve"
  }
}
```

### 8. 完成工作流

```json
{
  "tool": "spec_workflow",
  "arguments": {
    "stage": "complete"
  }
}
```

**响应示例**:
```json
{
  "currentStage": "complete",
  "requirementsApproved": true,
  "designApproved": true,
  "tasksApproved": true,
  "stageGuidance": "✅ WORKFLOW COMPLETE\n\n...",
  "canProceed": true
}
```

## 错误处理示例

### 尝试跳过阶段

```json
{
  "tool": "spec_workflow",
  "arguments": {
    "stage": "design",
    "action": "start"
  }
}
```

**错误响应**（如果需求未批准）:
```json
{
  "error": "Requirements must be approved before proceeding to design",
  "status": "failed",
  "currentStage": "requirements"
}
```

## 生成的文件结构

完成整个工作流后，将生成以下文件结构：

```
.specs/user-authentication/
├── requirements.md    # EARS格式需求文档
├── design.md         # 详细技术设计文档
└── tasks.md          # 可执行编码任务列表
```

## 最佳实践

1. **按顺序执行**: 严格按照 requirements → design → implementation → complete 的顺序执行
2. **明确批准**: 每个阶段都需要明确的用户批准才能继续
3. **详细反馈**: 在修订阶段提供具体的反馈意见
4. **功能命名**: 使用清晰的功能名称便于文件组织
5. **完整文档**: 确保每个阶段的文档都完整且符合要求

## 集成到AI助手中

AI助手应该：

1. **监听工作流状态**: 根据当前阶段提供相应的指导
2. **强制执行约束**: 不允许跳过阶段或在未批准时继续
3. **提供详细指导**: 使用 `stageGuidance` 中的信息指导用户
4. **处理用户反馈**: 在修订阶段根据用户反馈调整文档
5. **完成后停止**: 在 complete 阶段明确告知用户工作流已完成
