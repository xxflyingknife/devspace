import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner'; // Assuming you have this
import './FileTreeViewer.css'; // Create this CSS file

function FileTreeViewer({ repoId }) {
  const [treeData, setTreeData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!repoId) return;

    setIsLoading(true);
    setError(null);
    setTreeData(null); // Clear previous data

    // --- Mock Fetch ---
    // Replace with actual API call to your backend endpoint
    // This endpoint should return the file tree structure for the given repoId
    const fetchTreeData = async () => {
      console.log(`Fetching file tree for repo: ${repoId}`);
      // Example: await fetch(`/api/git/tree?repoId=${repoId}`)
      // Simulating network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      try {
        // Mock response structure - replace with your actual data structure
        const mockData = [
          { id: '1', name: 'backend', type: 'folder', children: [
            { id: '1-1', name: 'app', type: 'folder', children: [
              { id: '1-1-1', name: 'main.py', type: 'file' },
              { id: '1-1-2', name: 'database.py', type: 'file' },
            ]},
            { id: '1-2', name: 'Dockerfile', type: 'file' },
            { id: '1-3', name: 'requirements.txt', type: 'file' },
          ]},
          { id: '2', name: 'frontend', type: 'folder', children: [
             { id: '2-1', name: 'src', type: 'folder', children: [
               { id: '2-1-1', name: 'App.js', type: 'file' },
               { id: '2-1-2', name: 'index.js', type: 'file' },
             ]},
             { id: '2-2', name: 'package.json', type: 'file' },
          ]},
          { id: '3', name: 'kubernetes', type: 'folder' },
          { id: '4', name: 'README.md', type: 'file' },
          { id: '5', name: '.gitignore', type: 'file' },
        ];
        setTreeData(mockData);
      } catch (err) {
        console.error("Error fetching file tree:", err);
        setError("Failed to load file tree.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTreeData();
    // --- End Mock Fetch ---

  }, [repoId]); // Re-fetch when repoId changes

  // Recursive function to render tree nodes (Simplified)
  // For a real tree, you'd need state for expanded nodes, proper indentation, icons etc.
  const renderTree = (nodes) => {
    if (!nodes) return null;
    return (
      <ul className="file-tree">
        {nodes.map(node => (
          <li key={node.id} className={`tree-node ${node.type}`}>
            <span className="node-name">
              {node.type === 'folder' ? '📁' : '📄'} {node.name}
            </span>
            {node.children && node.children.length > 0 && (
              // Recursively render children - needs proper expand/collapse logic
              <div className="node-children">
                 {renderTree(node.children)}
              </div>
            )}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="file-tree-container">
      {isLoading && <LoadingSpinner />}
      {error && <p className="error-message">{error}</p>}
      {!isLoading && !error && treeData && renderTree(treeData)}
      {!isLoading && !error && !treeData && <p>No file data loaded.</p>}
    </div>
  );
}

export default FileTreeViewer;
