// frontend/src/config/toolConfigs.js


export const debugToolsConfig = {
  // Generic tools available for any configured project
  generic: [
    { id: 'frontendLogs', label: 'Frontend Logs', icon: '📄F', drawerTitle: 'Frontend Application Logs' },
    { id: 'backendLogs', label: 'Backend Logs', icon: '📄B', drawerTitle: 'Backend Application Logs' },
  ],
  // Project-type specific default tools
  projectTypeDefaults: {
    'react-vite-ts': [ // Matches projectTypeId from DevLeftPanel wizard
      'frontendLogs', // ID from generic tools
      'variableInspector', // New tool
    ],
    'python-flask-api': [
      'backendLogs',
      'dbViewer',
      'variableInspector', // New tool
    ],
    // Add more project types and their default debug tool IDs
  },
  // All available debug tools (for "Add More Tools" functionality)
  allAvailable: [
    { id: 'frontendLogs', label: 'Frontend Logs', icon: '📄F', drawerTitle: 'Frontend Application Logs', description: "View client-side application logs." },
    { id: 'backendLogs', label: 'Backend Logs', icon: '📄B', drawerTitle: 'Backend Application Logs', description: "View server-side application logs." },
    { id: 'variableInspector', label: 'Variable Inspector', icon: '{x}', drawerTitle: 'Variable Inspector', description: "Inspect runtime variables (requires debug session)." },
    { id: 'dbViewer', label: 'DB Viewer', icon: '🛢️', drawerTitle: 'Database Viewer', description: "Browse and query connected database." },
    { id: 'cacheViewer', label: 'Cache Viewer', icon: '⚡', drawerTitle: 'Cache Viewer', description: "Inspect cache keys and values." },
    { id: 'networkMonitor', label: 'Network Monitor', icon: '📡', drawerTitle: 'Network Monitor', description: "View and analyze network requests." },
  ],
};


// We need a new structure for Plugin Market plugins
export const marketPlugins = [
  // Platform Function Plugins
  { id: 'scaffold-vue', name: 'Vue.js Project Scaffolder', category: '平台功能插件', subCategory: '开发项目类型', targetSpaceType: 'dev', description: 'Adds a Vue.js + Vite project template for quickstarts.', version: '1.0.2', author: 'Community Contributors', installed: false, icon: '🏗️' },
  { id: 'debug-aws-fargate', name: 'AWS Fargate Debug Adapter', category: '平台功能插件', subCategory: 'Debug 环境', targetSpaceType: 'dev', description: 'Integrates debugging for AWS Fargate tasks.', version: '0.9.0', author: 'PluginCorp LLC', installed: true, icon: '🐛' },
  { id: 'deploy-lambda', name: 'AWS Lambda Deployment', category: '平台功能插件', subCategory: '部署环境', targetSpaceType: 'dev', description: 'Enables direct deployment to AWS Lambda.', version: '1.1.0', author: 'PluginCorp LLC', installed: false, icon: '🚀' },
  { id: 'workload-ecs', name: 'AWS ECS Workload Viewer', category: '平台功能插件', subCategory: 'Workload 类型', targetSpaceType: 'ops', description: 'View and manage AWS ECS services.', version: '1.0.0', author: 'Community Contributors', installed: true, icon: '🚢' },
  { id: 'debug-logs-enhanced', name: 'Enhanced Log Viewer', category: '平台功能插件', subCategory: 'Debug 面板工具', targetSpaceType: 'all', description: 'Advanced filtering for log viewing.', version: '1.3.0', author: 'ToolDevs Inc.', installed: false, icon: '🔍' },

  // AI Smart Plugins
  { id: 'agent-custom-rag', name: 'Custom RAG Agent for Docs', category: 'AI 智能插件', subCategory: 'LLM Agents', targetSpaceType: 'all', description: 'A specialized RAG agent for knowledge bases.', version: '1.2.0', author: 'AI Solutions Ltd.', installed: true, icon: '🧠' },
  { id: 'mcp-jenkins', name: 'Jenkins MCP Adapter', category: 'AI 智能插件', subCategory: 'MCP Server Adapters', targetSpaceType: 'all', description: 'Connects to Jenkins for CI/CD jobs.', version: '1.0.0', author: 'Community CI', installed: false, icon: '🤖' },
  { id: 'aiops-timeseries', name: 'Timeseries Anomaly Skill', category: 'AI 智能插件', subCategory: 'AIOps 技能', targetSpaceType: 'ops', description: 'Advanced time-series anomaly detection.', version: '2.1.0', author: 'AI Solutions Ltd.', installed: true, icon: '📈' },
];


export const devTools = [
  {
    id: 'gitPush',
    label: 'Git Push',
    modalTitle: 'Git Push Parameters',
    primary: true, // Show this button directly
    fields: [
      { name: 'branch', label: 'Branch', type: 'text', defaultValue: 'main' },
      { name: 'commitMessage', label: 'Commit Message (optional)', type: 'text', placeholder: 'Defaults to last commit if empty' },
      { name: 'forcePush', label: 'Force Push (-f)', type: 'checkbox', defaultValue: false }
    ],
  },
  {
    id: 'deployAlpha',
    label: 'Deploy Alpha', // Shortened label for button
    modalTitle: 'Deploy to Alpha Parameters',
    primary: true, // Show this button directly
    fields: [
      { name: 'version', label: 'Version/Tag', type: 'text', placeholder: 'e.g., latest, v1.2.0', defaultValue: 'latest' },
      { name: 'serviceName', label: 'Service Name', type: 'text', placeholder: 'e.g., my-app-backend' },
    ],
  },
  {
    id: 'runTests',
    label: 'Run Tests', // Shortened label
    modalTitle: 'Run Unit Tests Confirmation',
    primary: true, // Show this button directly
    confirmationMessage: 'Are you sure you want to run all unit tests for the current project?',
  },
  // Additional Dev Tools for the "More Tools" menu
  {
    id: 'viewCommitHistory',
    label: 'View Commit History',
    modalTitle: 'View Commit History Parameters',
    primary: false,
    fields: [
        { name: 'branch', label: 'Branch', type: 'text', defaultValue: 'main' },
        { name: 'maxCount', label: 'Max Commits', type: 'number', defaultValue: 10 }
    ]
  },
  {
    id: 'createBranch',
    label: 'Create New Branch',
    modalTitle: 'Create New Branch',
    primary: false,
    fields: [
        { name: 'newBranchName', label: 'New Branch Name', type: 'text', placeholder: 'e.g., feature/xyz' },
        { name: 'fromBranch', label: 'Create from Branch (optional)', type: 'text', placeholder: 'Defaults to current branch' }
    ]
  }
];

export const opsTools = [
  {
    id: 'getPodLogs',
    label: 'Get Pod Logs',
    modalTitle: 'Get Pod Logs Parameters',
    primary: true,
    fields: [
      { name: 'namespace', label: 'Namespace', type: 'text', placeholder: 'e.g., default' },
      { name: 'podName', label: 'Pod Name', type: 'text', placeholder: 'e.g., my-pod-123xyz' },
      { name: 'containerName', label: 'Container (optional)', type: 'text' },
      { name: 'tailLines', label: 'Tail Lines', type: 'number', defaultValue: 100 },
    ],
  },
  {
    id: 'restartDeployment',
    label: 'Restart Deploy', // Shortened
    modalTitle: 'Restart Deployment Confirmation',
    primary: true,
    fields: [
        { name: 'namespace', label: 'Namespace', type: 'text', placeholder: 'e.g., production' },
        { name: 'deploymentName', label: 'Deployment Name', type: 'text', placeholder: 'e.g., user-service' },
    ],
    confirmationMessage: 'Are you sure you want to perform a rolling restart of this deployment?',
  },
  {
    id: 'scaleDeployment',
    label: 'Scale Deploy', // Shortened
    modalTitle: 'Scale Deployment Parameters',
    primary: true,
    fields: [
        { name: 'namespace', label: 'Namespace', type: 'text' },
        { name: 'deploymentName', label: 'Deployment Name', type: 'text' },
        { name: 'replicas', label: 'Number of Replicas', type: 'number', defaultValue: 1 },
    ],
  },
  // Additional Ops Tools for the "More Tools" menu
  {
    id: 'viewClusterEvents',
    label: 'View Cluster Events',
    modalTitle: 'View Cluster Events Parameters',
    primary: false,
    fields: [
        { name: 'namespace', label: 'Namespace (optional)', type: 'text', placeholder: 'All namespaces if empty' },
        { name: 'limit', label: 'Limit', type: 'number', defaultValue: 50 }
    ]
  },
  {
    id: 'execInPod',
    label: 'Execute in Pod',
    modalTitle: 'Execute Command in Pod',
    primary: false,
    fields: [
        { name: 'namespace', label: 'Namespace', type: 'text' },
        { name: 'podName', label: 'Pod Name', type: 'text' },
        { name: 'containerName', label: 'Container (optional)', type: 'text' },
        { name: 'command', label: 'Command to Execute', type: 'text', placeholder: 'e.g., ls -l /app' }
    ],
    confirmationMessage: 'Executing commands directly in pods can be risky. Are you sure?'
  }
];


