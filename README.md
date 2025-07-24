# Spec Workflow MCP Server

一个基于 Model Context Protocol (MCP) 的规范化开发流程服务，指导 AI 模型按照结构化的三阶段流程处理用户需求：需求收集、设计文档、实现计划。

## 功能特性

### 🔄 三阶段工作流程

1. **需求收集阶段 (Requirements)**
   - 生成 EARS 格式的需求文档
   - 包含用户故事和验收标准
   - 必须获得用户明确批准才能进入下一阶段

2. **设计文档阶段 (Design)**
   - 创建详细的技术设计文档
   - 包含架构、组件、数据模型、错误处理
   - 进行必要的研究并整合发现
   - 必须获得用户明确批准才能进入下一阶段

3. **实现计划阶段 (Implementation)**
   - 生成可执行的编码任务清单
   - 专注于代码相关任务（不包括部署、用户测试等）
   - 格式化为带编号的复选框列表
   - 引用具体的需求条目

### 🛡️ 流程控制

- **严格的阶段顺序**：防止跳过阶段
- **批准状态跟踪**：每个阶段都需要明确批准
- **详细指导**：为每个阶段提供具体的操作指南
- **错误防护**：防止无效的阶段转换

## 安装和使用

### 1. 安装依赖

```bash
npm install
```

### 2. 构建项目

```bash
npm run build
```

### 3. 启动服务

```bash
npm start
```

### 4. 开发模式

```bash
npm run dev
```

## MCP 工具使用

### `spec_workflow` 工具

#### 参数

- `stage` (必需): 工作流阶段
  - `"requirements"` - 需求收集阶段
  - `"design"` - 设计文档阶段  
  - `"implementation"` - 实现计划阶段
  - `"complete"` - 完成阶段

- `featureName` (可选): 功能名称，用于文件组织

- `action` (可选): 要执行的操作
  - `"start"` - 开始阶段
  - `"approve"` - 批准当前阶段
  - `"revise"` - 修订当前阶段

- `feedback` (可选): 用户反馈或修订意见

#### 使用示例

```json
{
  "stage": "requirements",
  "featureName": "user-authentication",
  "action": "start"
}
```

```json
{
  "stage": "requirements", 
  "action": "approve"
}
```

```json
{
  "stage": "design",
  "action": "revise",
  "feedback": "需要添加更多的错误处理细节"
}
```

## 工作流程详解

### 阶段 1: 需求收集

**目标**: 基于功能想法生成 EARS 格式的需求

**关键操作**:
1. 创建 `.specs/{feature_name}/requirements.md` 文件
2. 生成初始需求（不要先问连续问题）
3. 格式化包含：
   - 功能总结的清晰介绍
   - 分层编号的需求列表
   - 用户故事格式："作为[角色]，我想要[功能]，以便[收益]"
   - EARS 格式的验收标准
4. 考虑边缘情况、用户体验、技术约束和成功标准
5. 使用 'userInput' 工具请求批准，原因为 'spec-requirements-review'
6. 继续反馈-修订循环直到明确批准

**关键约束**: 在获得明确批准之前不得进入设计阶段！

### 阶段 2: 设计文档

**目标**: 基于已批准的需求开发综合设计文档

**关键操作**:
1. 创建 `.specs/{feature_name}/design.md` 文件
2. 进行必要的研究并建立上下文
3. 包含必需的部分：
   - 概述
   - 架构
   - 组件和接口
   - 数据模型
   - 错误处理
   - 测试策略
4. 适当时包含 Mermaid 图表
5. 突出设计决策和理由
6. 使用 'userInput' 工具请求批准，原因为 'spec-design-review'
7. 继续反馈-修订循环直到明确批准

**关键约束**: 在获得明确批准之前不得进入实现计划阶段！

### 阶段 3: 实现计划

**目标**: 创建带有编码任务的可执行实现计划

**关键操作**:
1. 创建 `.specs/{feature_name}/tasks.md` 文件
2. 将设计转换为代码生成 LLM 的一系列提示
3. 格式化为编号复选框列表（最多2级）
4. 每个任务必须：
   - 有涉及编写/修改/测试代码的明确目标
   - 引用具体需求
   - 在前面步骤基础上递增构建
   - 可由编码代理执行
5. 仅专注于编码任务（无部署、用户测试等）
6. 使用 'userInput' 工具请求批准，原因为 'spec-tasks-review'
7. 继续反馈-修订循环直到明确批准

**关键约束**: 此工作流仅用于创建工件，不用于实现！

## 文件结构

```
.specs/{feature_name}/
├── requirements.md    # EARS 格式需求文档
├── design.md         # 详细技术设计文档
└── tasks.md          # 可执行编码任务列表
```

## 环境变量

- `DISABLE_WORKFLOW_LOGGING`: 设置为 "true" 禁用工作流日志输出

## 开发

### 项目结构

```
src/
└── spec-workflow/
    └── index.ts      # 主要的 MCP 服务器实现
```

### 脚本

- `npm run build` - 编译 TypeScript
- `npm run dev` - 监视模式编译
- `npm run clean` - 清理构建文件
- `npm start` - 启动服务器

## 许可证

MIT License
