// frontend/src/pages/SpaceDetailPage.js
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header';
import DevLeftPanel from '../components/DevLeftPanel';
import DevRightPanel from '../components/DevRightPanel';
import OpsLeftPanel from '../components/OpsLeftPanel';
import OpsRightPanel from '../components/OpsRightPanel';
import ChatInterface from '../components/ChatInterface';
import Drawer from '../components/Drawer';
import LoadingSpinner from '../components/LoadingSpinner'; // Assuming you want to use this
import './SpaceDetailPage.css';

// Mock data/functions (replace with API calls)
const mockFetchSpaceDetails = async (spaceId) => {
    console.log(`Fetching details for space: ${spaceId}`);
    await new Promise(resolve => setTimeout(resolve, 200));
    // In a real app, this comes from an API: GET /api/spaces/${spaceId}
    // Or from a shared state/context if spaces list is already fetched

    
const mockSpacesData = {
        //'proj-prefab-modular': { id: 'proj-prefab-modular', name: '预制和模块化建筑市场概览', type: 'dev', description: 'Dev space for modular architecture project.' },
        //'ops-cluster-monitor': { id: 'ops-cluster-monitor', name: '生产环境集群监控 Ops', type: 'ops', description: 'Ops space for K8s cluster monitoring.' },
        //'art-wheelwrighting': { id: 'art-wheelwrighting', name: 'The Art and Craft of Wheelwrighting', type: 'dev', description: 'Dev space for historical crafts.' },
        //'play-benefits': { id: 'play-benefits', name: '户玩游戏对儿童成长的益处', type: 'dev', description: 'Dev space for child development research.' },
        //'sre-incident-response': { id: 'sre-incident-response', name: 'SRE 事件响应手册 Ops', type: 'ops', description: 'Ops space for SRE playbooks.' },
        //'disaster-recovery': { id: 'disaster-checklist', name: '灾害应急物品清单', type: 'ops', description: 'Dev space for disaster preparedness.' }
	'music-dev': { id: 'music-dev', name: '音乐服务', type: 'dev', date: '2025年5月5日', sourceCount: 16, icon: '📦' },
        'music-cluster-monitor': { id: 'music-cluster-monitor', name: '音乐服务维护 Ops', type: 'ops', date: '2025年5月6日', sourceCount: 22, icon: '🛠️  ' },
        'art-wheelwrighting': { id: 'art-wheelwrighting', name: 'The Art and Craft of Wheelwrighting', type: 'dev', date: '2025年5月5日', sourceCount: 9, icon: '⚙️', color: '#FFF9C4' },
        'play-benefits': { id: 'play-benefits', name: '游戏空间', type: 'dev', date: '2025年5月11日', sourceCount: 15, icon: '🏡', color: '#E8F5E9' },
        'sre-incident-response': { id: 'sre-incident-response', name: 'SRE 异常事件应急', type: 'ops', date: '2025年5月12日', sourceCount: 18, icon: '🚨', color: '#FFEBEE' },
        'disaster-recovery': { id: 'disaster-recovery', name: '容灾流控切换', type: 'ops', date: '2025年5月11日', sourceCount: 12, icon: '⏱️  ', color: '#FCE4EC' },
    
};
    const details = mockSpacesData[spaceId] || { id: spaceId, name: `空间 ${spaceId}`, type: spaceId.includes('ops') ? 'ops' : 'dev', description: '未知空间类型或ID，请检查mockFetchSpaceDetails' };
    console.log("Fetched details:", details);
    return details;
};


function SpaceDetailPage() {
  const { spaceId } = useParams();
  const [spaceDetails, setSpaceDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Theme and Drawer states (can be moved to a global context later)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'system');
  const [showHelpDrawer, setShowHelpDrawer] = useState(false);
  const [showFeedbackDrawer, setShowFeedbackDrawer] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    console.log(`SpaceDetailPage useEffect triggered for spaceId: ${spaceId}`);
    mockFetchSpaceDetails(spaceId)
      .then(data => {
        if (data) { // Ensure data is not undefined if spaceId is not in mock
            setSpaceDetails(data);
        } else {
            setError(`无法找到 ID 为 "${spaceId}" 的空间详情。`);
            console.error(`No details found for spaceId: ${spaceId}`);
        }
      })
      .catch(err => {
        console.error("Error fetching space details in useEffect:", err);
        setError("无法加载空间详情");
      })
      .finally(() => setIsLoading(false));
  }, [spaceId]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleToggleTheme = (selectedTheme) => {
    setTheme(selectedTheme);
  };

  if (isLoading) return (
    <div className="space-detail-page">
        <Header pageType="detail" spaceName="加载中..." /> {/* Show generic header while loading */}
        <div className="loading-fullpage"><LoadingSpinner /> 加载空间详情...</div>
    </div>
  );
  if (error) return (
    <div className="space-detail-page">
        <Header pageType="detail" spaceName="错误" />
        <div className="error-fullpage">{error}</div>
    </div>
  );
  // This check is important!
  if (!spaceDetails || !spaceDetails.type) return (
    <div className="space-detail-page">
        <Header pageType="detail" spaceName="空间未找到" />
        <div className="error-fullpage">无法加载空间数据或空间类型未知。请返回列表重试。</div>
    </div>
  );


  return (
    <div className="space-detail-page">
      <Header
        pageType="detail"
        spaceType={spaceDetails.type}
        spaceName={spaceDetails.name}
        onToggleTheme={handleToggleTheme}
        onShowHelp={() => setShowHelpDrawer(true)}
        onShowFeedback={() => setShowFeedbackDrawer(true)}
      />

      <main className="three-column-layout">
        <div className="column left-column">
          {spaceDetails.type === 'dev' ? <DevLeftPanel spaceId={spaceId} /> : <OpsLeftPanel spaceId={spaceId} />}
        </div>

        <div className="column middle-column">
          <ChatInterface spaceId={spaceId} spaceType={spaceDetails.type} />
        </div>

        <div className="column right-column">
          {spaceDetails.type === 'dev' ? <DevRightPanel spaceId={spaceId} /> : <OpsRightPanel spaceId={spaceId} />}
        </div>
      </main>

      <Drawer isOpen={showHelpDrawer} onClose={() => setShowHelpDrawer(false)} title="帮助中心" position="right">
        <div className="drawer-content-placeholder">
            <h2>如何使用空间详情</h2>
            {spaceDetails.type === 'dev' && (
                <>
                    <p><strong>Dev 空间:</strong></p>
                    <p>左侧是您的 Git 仓库文件浏览器 (由 DevLeftPanel 组件渲染)。您可以在此查看文件、切换分支 (控件现在位于FileTreeViewer内部)，并通过FileTreeViewer顶部的设置按钮配置仓库地址。</p>
                    <p>中间是与 AI 助手的聊天窗口。聊天输入框上方现在有针对 Dev 场景的快捷工具按钮，例如 "Git Push" 和 "Deploy to Alpha"。</p>
                    <p>右侧是您的 Kubernetes 部署环境 (由 DevRightPanel 组件渲染)。您可以按环境 (Test, Grayscale, Production) 查看部署状态，并通过顶部的“部署”按钮触发新的部署或配置环境。</p>
                </>
            )}
            {spaceDetails.type === 'ops' && (
                 <>
                    <p><strong>Ops 空间:</strong></p>
                    <p>左侧栏显示了您当前关注的 Kubernetes Workloads 列表及其状态 (由 OpsLeftPanel 组件渲染)。</p>
                    <p>中间是与 AI 助手的聊天窗口，您可以让它帮助您查询监控数据、分析日志、执行预定义的运维操作（通过工具）等。</p>
                    <p>右侧栏是 AIOps Studio (由 OpsRightPanel 组件渲染)，包含可用的 AIOps 技能插件、SRE 自动化计划任务和您保存的 Prompt 会话，方便快速调用和复用。</p>
                </>
            )}
            <p>通用提示：使用聊天窗口底部的工具按钮（如果可用）来执行特定场景的自动化操作。</p>
        </div>
      </Drawer>
      <Drawer isOpen={showFeedbackDrawer} onClose={() => setShowFeedbackDrawer(false)} title="提交反馈" position="right">
        <div className="drawer-content-placeholder">
            <h2>我们重视您的意见！</h2>
            <form className="feedback-form" onSubmit={(e) => {e.preventDefault(); alert('感谢您的反馈！'); setShowFeedbackDrawer(false);}}>
                <div className="form-group">
                    <label htmlFor="feedbackTypeDetail">反馈类型</label>
                    <select id="feedbackTypeDetail"><option value="bug">错误报告</option><option value="feature">功能建议</option><option value="general">一般反馈</option></select>
                </div>
                <div className="form-group">
                    <label htmlFor="feedbackMessageDetail">详细信息</label>
                    <textarea id="feedbackMessageDetail" rows="8" required placeholder="请详细描述您的问题或建议..."></textarea>
                </div>
                 <div className="form-group">
                    <label htmlFor="feedbackEmailDetail">您的邮箱 (可选)</label>
                    <input type="email" id="feedbackEmailDetail" placeholder="以便我们回复您"/>
                </div>
                <button type="submit" className="modal-button primary">提交反馈</button>
            </form>
        </div>
      </Drawer>

    </div>
  );
}

export default SpaceDetailPage; // Make sure this is the last line!


