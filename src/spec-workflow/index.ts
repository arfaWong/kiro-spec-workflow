#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import chalk from 'chalk';

interface WorkflowState {
  currentStage: 'requirements' | 'design' | 'implementation' | 'complete';
  featureName?: string;
  requirementsApproved: boolean;
  designApproved: boolean;
  tasksApproved: boolean;
  stageHistory: string[];
}

interface StageTransition {
  stage: 'requirements' | 'design' | 'implementation' | 'complete';
  featureName?: string;
  action?: 'approve' | 'revise' | 'start';
  feedback?: string;
}

class SpecWorkflowServer {
  private workflowState: WorkflowState;
  private disableLogging: boolean;

  constructor() {
    this.workflowState = {
      currentStage: 'requirements',
      requirementsApproved: false,
      designApproved: false,
      tasksApproved: false,
      stageHistory: []
    };
    this.disableLogging = (process.env.DISABLE_WORKFLOW_LOGGING || "").toLowerCase() === "true";
  }

  private validateStageTransition(input: unknown): StageTransition {
    const data = input as Record<string, unknown>;

    if (!data.stage || typeof data.stage !== 'string') {
      throw new Error('Invalid stage: must be a string');
    }

    const validStages = ['requirements', 'design', 'implementation', 'complete'];
    if (!validStages.includes(data.stage)) {
      throw new Error(`Invalid stage: must be one of ${validStages.join(', ')}`);
    }

    return {
      stage: data.stage as 'requirements' | 'design' | 'implementation' | 'complete',
      featureName: data.featureName as string | undefined,
      action: data.action as 'approve' | 'revise' | 'start' | undefined,
      feedback: data.feedback as string | undefined,
    };
  }

  private formatStageGuidance(stage: string): string {
    const stageGuidance: Record<string, string> = {
      requirements: `
📋 REQUIREMENTS GATHERING STAGE

Current Objective: Generate requirements in EARS format based on the feature idea

Key Actions Required:
1. Create '.specs/{feature_name}/requirements.md' file
2. Generate initial requirements WITHOUT asking sequential questions first
3. Format with:
   - Clear introduction summarizing the feature
   - Hierarchical numbered list of requirements
   - User stories: "As a [role], I want [feature], so that [benefit]"
   - Acceptance criteria in EARS format
4. Consider edge cases, UX, technical constraints, success criteria
5. Ask user for approval using 'userInput' tool with reason 'spec-requirements-review'
6. Continue feedback-revision cycle until explicit approval

CRITICAL: Do NOT proceed to design until user explicitly approves requirements!`,

      design: `
🎨 DESIGN DOCUMENT CREATION STAGE

Current Objective: Develop comprehensive design based on approved requirements

Key Actions Required:
1. Create '.specs/{feature_name}/design.md' file
2. Conduct necessary research and build context
3. Include required sections:
   - Overview
   - Architecture
   - Components and Interfaces
   - Data Models
   - Error Handling
   - Testing Strategy
4. Include Mermaid diagrams when appropriate
5. Highlight design decisions and rationales
6. Ask user for approval using 'userInput' tool with reason 'spec-design-review'
7. Continue feedback-revision cycle until explicit approval

CRITICAL: Do NOT proceed to implementation planning until user explicitly approves design!`,

      implementation: `
⚡ IMPLEMENTATION PLANNING STAGE

Current Objective: Create actionable implementation plan with coding tasks

Key Actions Required:
1. Create '.specs/{feature_name}/tasks.md' file
2. Convert design into series of prompts for code-generation LLM
3. Format as numbered checkbox list (max 2 levels)
4. Each task must:
   - Have clear objective involving writing/modifying/testing code
   - Reference specific requirements
   - Build incrementally on previous steps
   - Be actionable by coding agent
5. Focus ONLY on coding tasks (no deployment, user testing, etc.)
6. Ask user for approval using 'userInput' tool with reason 'spec-tasks-review'
7. Continue feedback-revision cycle until explicit approval

CRITICAL: This workflow is ONLY for creating artifacts, not implementing!`,

      complete: `
✅ WORKFLOW COMPLETE

All specification artifacts have been created and approved:
- Requirements document
- Design document
- Implementation tasks

Next Steps:
- Open the tasks.md file
- Click "Start task" next to task items to begin implementation
- This workflow is complete - actual implementation is a separate process`
    };

    return stageGuidance[stage] || 'Unknown stage';
  }

  private getNextStageInstructions(): string {
    switch (this.workflowState.currentStage) {
      case 'requirements':
        return "After user approves requirements, transition to 'design' stage";
      case 'design':
        return "After user approves design, transition to 'implementation' stage";
      case 'implementation':
        return "After user approves tasks, transition to 'complete' stage";
      case 'complete':
        return "Workflow is complete";
      default:
        return "Unknown stage";
    }
  }

  public processStageTransition(input: unknown): { content: Array<{ type: string; text: string }>; isError?: boolean } {
    try {
      const transition = this.validateStageTransition(input);

      // Update feature name if provided
      if (transition.featureName) {
        this.workflowState.featureName = transition.featureName;
      }

      // Handle stage transitions
      if (transition.stage !== this.workflowState.currentStage) {
        // Validate transition is allowed
        const canTransition = this.canTransitionTo(transition.stage);
        if (!canTransition.allowed) {
          throw new Error(canTransition.reason);
        }

        this.workflowState.stageHistory.push(this.workflowState.currentStage);
        this.workflowState.currentStage = transition.stage;
      }

      // Handle approvals
      if (transition.action === 'approve') {
        switch (this.workflowState.currentStage) {
          case 'requirements':
            this.workflowState.requirementsApproved = true;
            break;
          case 'design':
            this.workflowState.designApproved = true;
            break;
          case 'implementation':
            this.workflowState.tasksApproved = true;
            break;
        }
      }

      if (!this.disableLogging) {
        const guidance = this.formatStageGuidance(this.workflowState.currentStage);
        console.error(chalk.blue(guidance));
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            currentStage: this.workflowState.currentStage,
            featureName: this.workflowState.featureName,
            requirementsApproved: this.workflowState.requirementsApproved,
            designApproved: this.workflowState.designApproved,
            tasksApproved: this.workflowState.tasksApproved,
            nextInstructions: this.getNextStageInstructions(),
            stageGuidance: this.formatStageGuidance(this.workflowState.currentStage),
            canProceed: this.canProceedToNext()
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
            status: 'failed',
            currentStage: this.workflowState.currentStage
          }, null, 2)
        }],
        isError: true
      };
    }
  }

  private canTransitionTo(targetStage: string): { allowed: boolean; reason?: string } {
    switch (targetStage) {
      case 'requirements':
        return { allowed: true };
      case 'design':
        if (!this.workflowState.requirementsApproved) {
          return { allowed: false, reason: 'Requirements must be approved before proceeding to design' };
        }
        return { allowed: true };
      case 'implementation':
        if (!this.workflowState.designApproved) {
          return { allowed: false, reason: 'Design must be approved before proceeding to implementation planning' };
        }
        return { allowed: true };
      case 'complete':
        if (!this.workflowState.tasksApproved) {
          return { allowed: false, reason: 'Tasks must be approved before completing workflow' };
        }
        return { allowed: true };
      default:
        return { allowed: false, reason: 'Invalid target stage' };
    }
  }

  private canProceedToNext(): boolean {
    switch (this.workflowState.currentStage) {
      case 'requirements':
        return this.workflowState.requirementsApproved;
      case 'design':
        return this.workflowState.designApproved;
      case 'implementation':
        return this.workflowState.tasksApproved;
      case 'complete':
        return true;
      default:
        return false;
    }
  }
}

const SPEC_WORKFLOW_TOOL: Tool = {
  name: "spec_workflow",
  description: `A comprehensive tool for guiding development workflow through three structured stages:
1. Requirements Gathering - Generate EARS format requirements
2. Design Document Creation - Create detailed technical design
3. Implementation Planning - Generate actionable coding tasks

This tool enforces a strict workflow where each stage must be completed and approved before proceeding to the next.

Key Features:
- Enforces sequential workflow progression
- Tracks approval status for each stage
- Provides detailed guidance for each stage
- Prevents skipping stages without proper approval
- Creates structured documentation in .specs/{feature_name}/ directory

Workflow Stages:

REQUIREMENTS STAGE:
- Create requirements.md with EARS format
- Include user stories and acceptance criteria
- Must get explicit user approval before proceeding
- Use 'userInput' tool with reason 'spec-requirements-review'

DESIGN STAGE:
- Create design.md with comprehensive technical design
- Include architecture, components, data models, error handling
- Conduct research and include findings
- Must get explicit user approval before proceeding
- Use 'userInput' tool with reason 'spec-design-review'

IMPLEMENTATION STAGE:
- Create tasks.md with actionable coding tasks
- Focus ONLY on code-related tasks (no deployment, user testing)
- Format as numbered checkbox list
- Reference specific requirements
- Must get explicit user approval to complete workflow
- Use 'userInput' tool with reason 'spec-tasks-review'

Parameters:
- stage: Current workflow stage ('requirements', 'design', 'implementation', 'complete')
- featureName: Name of the feature being developed (optional, for tracking)
- action: Action to take ('start', 'approve', 'revise')
- feedback: User feedback for revisions (optional)

The tool will provide detailed guidance for the current stage and prevent invalid transitions.`,
  inputSchema: {
    type: "object",
    properties: {
      stage: {
        type: "string",
        enum: ["requirements", "design", "implementation", "complete"],
        description: "The workflow stage to transition to or work on"
      },
      featureName: {
        type: "string",
        description: "Name of the feature being developed (used for file organization)"
      },
      action: {
        type: "string",
        enum: ["start", "approve", "revise"],
        description: "Action to take in the current stage"
      },
      feedback: {
        type: "string",
        description: "User feedback for revisions or additional context"
      }
    },
    required: ["stage"]
  }
};

const server = new Server(
  {
    name: "spec-workflow-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const workflowServer = new SpecWorkflowServer();

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [SPEC_WORKFLOW_TOOL],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "spec_workflow") {
    return workflowServer.processStageTransition(request.params.arguments);
  }

  return {
    content: [{
      type: "text",
      text: `Unknown tool: ${request.params.name}`
    }],
    isError: true
  };
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Spec Workflow MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
