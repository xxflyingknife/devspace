import React, { useState, useEffect } from 'react';
import FileTreeViewer from './FileTreeViewer'; // Assuming FileTreeViewer handles its own data now
// We could also pass repoId and branch to FileTreeViewer if it fetches data internally
// For now, FileTreeViewer is self-contained regarding branch and search within itself.

function DevLeftPanel({ spaceId /*, initialRepoUrl, initialBranch */ }) {
  // Logic related to this specific panel can go here if needed,
  // for now, it primarily hosts the FileTreeViewer.

  // The Git settings modal and branch selection are now part of FileTreeViewer itself.

  return (
    <FileTreeViewer repoId={spaceId} />
  );
}

export default DevLeftPanel;
