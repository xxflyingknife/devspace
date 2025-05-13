// frontend/src/config/toolConfigs.js

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


