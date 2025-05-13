import React, { useState, useEffect } from 'react';
import Accordion from './Accordion';
// Add specific CSS if needed: import './OpsRightPanel.css';

const mockFetchAIOpsSkills = () => [{id: 'skill1', name: '异常检测'}, {id: 'skill2', name: '根因分析'}];
const mockFetchSREPlans = () => [{id: 'plan1', name: '数据库扩容预案'}, {id: 'plan2', name: '紧急回滚流程'}];
const mockFetchPrompts = () => [{id: 'p1', name: 'K8s Pod 重启排查'}, {id: 'p2', name: '网络延迟分析'}];

function OpsRightPanel({ spaceId }) {
  const [aiOpsSkills, setAIOpsSkills] = useState([]);
  const [srePlans, setSREPlans] = useState([]);
  const [savedPrompts, setSavedPrompts] = useState([]);

  useEffect(() => {
    setAIOpsSkills(mockFetchAIOpsSkills());
    setSREPlans(mockFetchSREPlans());
    setSavedPrompts(mockFetchPrompts());
  }, [spaceId]); // spaceId might influence available items later

  return (
    <>
      <div className="panel-header">
        <span className="panel-title">AIOps Studio</span>
        <button className="panel-header-button" title="Manage Studio Plugins">[+]</button>
      </div>
      <div className="ops-right-panel-content"> {/* Scrollable container */}
        <Accordion title="AIOps 技能插件" initialOpen={true}>
          <ul className="ops-plugin-list">
            {aiOpsSkills.map(skill => <li key={skill.id}><button className="plugin-button">{skill.name}</button></li>)}
          </ul>
        </Accordion>
        <Accordion title="SRE 计划任务" initialOpen={false}>
          <ul className="ops-plugin-list">
            {srePlans.map(plan => <li key={plan.id}><button className="plugin-button">{plan.name}</button></li>)}
          </ul>
          <button className="add-new-button">+ 新建计划</button>
        </Accordion>
        <Accordion title="Prompt 记事本" initialOpen={false}>
          <ul className="ops-plugin-list">
            {savedPrompts.map(p => <li key={p.id}><button className="plugin-button">{p.name}</button></li>)}
          </ul>
          <button className="add-new-button">+ 保存当前会话</button>
        </Accordion>
      </div>
    </>
  );
}
export default OpsRightPanel;
