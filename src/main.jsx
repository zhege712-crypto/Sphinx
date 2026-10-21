import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './responsive.css';
import './discovery.css';
import './theme.css';
class ErrorBoundary extends React.Component {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() { return this.state.error ? <main className="empty-state"><h1>页面暂时无法显示</h1><p>浏览器中保留的未保存内容会在重新打开文档时提示恢复。</p><button onClick={() => location.reload()}>重新加载页面</button></main> : this.props.children; }
}
createRoot(document.getElementById('root')).render(<ErrorBoundary><App /></ErrorBoundary>);
