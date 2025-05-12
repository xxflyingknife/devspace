import React from 'react';
import Header from '../components/Header'; // Use new Header
import SpaceCard from '../components/SpaceCard'; // Use new SpaceCard
import './SpaceListPage.css';

function SpaceListPage() {
  // --- Mock Data ---
  // More realistic mock data with colors/icons
  const spaces = [
    { id: 'proj-prefab-modular', name: '预制和模块化建筑市场概览', date: '2025年5月5日', sourceCount: 16, icon: '📦', color: '#E0F2F7' }, // Light cyan
    { id: 'art-wheelwrighting', name: 'The Art and Craft of Wheelwrighting', date: '2025年5月5日', sourceCount: 9, icon: '⚙️', color: '#FFF9C4' }, // Light yellow
    { id: 'play-benefits', name: '户玩游戏对儿童成长的益处', date: '2025年5月11日', sourceCount: 15, icon: '🏡', color: '#E8F5E9' }, // Light green
    { id: 'disaster-checklist', name: '灾害应急物品清单', date: '2025年5月11日', sourceCount: 12, icon: '⏱️', color: '#FCE4EC' }, // Light pink
    { id: 'cloud-native-dev', name: '云原生应用开发与管理', date: '2025年5月5日', sourceCount: 10, icon: '📦', color: '#EDE7F6' }, // Light purple
    { id: 'ancient-shipwrecks', name: '古代沉船与水下考古', date: '2025年5月5日', sourceCount: 6, icon: '🚢', color: '#FFF3E0' }, // Light orange
    { id: 'australia-overview', name: '澳大利亚概览', date: '2025年5月5日', sourceCount: 9, icon: '🇦🇺', color: '#E3F2FD' }, // Light blue
    { id: 'sre-skills', name: '商务与 SRE 英语技能提升', date: '2025年5月5日', sourceCount: 7, icon: '🤝', color: '#F1F8E9' }, // Another light green/lime
  ];
  // --- End Mock Data ---

  return (
    <div className="space-list-page-container">
      <Header pageTitle="NotebookLM Plus" /> {/* Use Header */}
      <main className="space-list-main">
        <div className="space-list-header">
          <h2>欢迎使用 NotebookLM Plus</h2>
          <div className="space-list-controls">
             <button className="new-space-button">+ 新建</button>
             <div className="view-controls">
                 <button className="control-button active">[Grid]</button> {/* Placeholder */}
                 <button className="control-button">[List]</button> {/* Placeholder */}
             </div>
             <select className="sort-dropdown" defaultValue="recent">
                 <option value="recent">最近</option>
                 <option value="name">名称</option>
             </select>
          </div>
        </div>
        <div className="space-grid">
          {spaces.map(space => (
            <SpaceCard
              key={space.id}
              id={space.id}
              name={space.name}
              date={space.date}
              sourceCount={space.sourceCount}
              icon={space.icon}
              color={space.color}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

export default SpaceListPage;
