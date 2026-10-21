import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { BookOpenText, FileText, Folder, ChevronDown, ChevronRight, Search, Plus, House, Files, Clock3, Users, Images, ArrowUpRight, LogOut, CheckCircle2, Circle, Loader2, Eye, Upload, History, MoreHorizontal, X, ExternalLink, Settings2, Download, ArrowLeft, PanelLeftClose, PanelLeftOpen, Info } from 'lucide-react';
import { api, post, setCsrf, downloadJson } from './api';
import { Reader, Outline } from './Reader';
import References, { BuildCredits, selectReferenceTag } from './References';
import SearchResults from './SearchResults';
import About from './About';
import { PROJECT_DOCUMENT_ID, CONTRIBUTORS_DOCUMENT_ID, isProjectDocument, isContributorsDocument, isAboutDocument } from '../shared/project.mjs';
import { TagList } from './Tags';
import { parseRoute, documentRoute, safeReturn } from '../shared/navigation.mjs';
import { searchEntries } from '../shared/search.mjs';
import useScrollMemory from './useScrollMemory';
import UpdatedAt from './UpdatedAt';
import useMediaQuery from './useMediaQuery';
import SiteNotice from './SiteNotice';
import BetaBadge from './BetaBadge';
import DeleteDocumentsDialog from './DeleteDocumentsDialog';
import TreeDocumentActions from './TreeDocumentActions';
import DirectoryOrderDialog from './DirectoryOrderDialog';
import { compareDirectoryEntries } from '../shared/directory-order.mjs';
import { ListOrdered, Trash2, Swords } from 'lucide-react';
import Authors from './Authors';
import PageBackground from './PageBackground';
import ScrollBoundary from './ScrollBoundary';
import ThemeSwitcher from './ThemeSwitcher';
import { Heart } from 'lucide-react';
import { hasValhalla, valhallaDocument } from '../shared/valhalla.mjs';
import { RelatedKnowledge } from './Valhalla';
const Editor = lazy(() => import('./Editor'));
const date = (value) => value ? new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
const Status = ({ doc }) => <span className={`status-tag ${doc.publishedVersion === doc.version ? 'published' : ''}`}>{!doc.publishedVersion ? '草稿' : doc.publishedVersion === doc.version ? '已发布' : '有未发布修改'}</span>;
const IconButton = ({ label, icon: Icon, onClick, disabled, ...props }) => <button className="icon-button" title={label} aria-label={label} onClick={onClick} disabled={disabled} {...props}><Icon size={18} /></button>;
const ManagementTable = ({ children }) => <div className="management-table-scroll" role="region" aria-label="可横向滚动的管理列表" tabIndex={0}><table className="management-table">{children}</table></div>;
function ReadingColumn({ documentId, children }) { const ref = useRef(); useScrollMemory(`reader:${documentId}`, ref); return <article ref={ref} className="document-column">{children}<SiteNotice /></article>; }
function ReferenceReading({ document, valhalla, previousRoute, onBack, onTag }) {
  const index = valhalla ? '#/valhalla' : '#/reference';
  return <div className="document-layout"><ReadingColumn key={document.id} documentId={`${valhalla ? 'valhalla:' : ''}${document.id}`}><div className="document-paper public-paper term-paper"><div className="term-navigation"><a className="term-back" href={previousRoute || index} onClick={event => { event.preventDefault(); onBack(); }}><ArrowLeft size={15} />{previousRoute ? '返回上一页' : valhalla ? '返回 Valhalla' : '返回词条索引'}</a>{previousRoute && previousRoute !== index && <a href={index}>{valhalla ? 'Valhalla' : '词条索引'}</a>}</div><RelatedKnowledge document={document} valhalla={valhalla} /><h1 className="document-title">{document.title}</h1>{valhalla && <p className="valhalla-description">Valhalla · 模型更新评价与性能测试</p>}<UpdatedAt document={document} /><TagList tags={document.tags} onSelect={onTag} />{valhalla && !document.blocks?.length ? <p className="valhalla-empty">评测内容正在准备中。</p> : <Reader blocks={document.blocks} />}</div><footer className="reading-footer"><BuildCredits /></footer></ReadingColumn><Outline blocks={document.blocks} /></div>;
}
function ManagementPage({ children }) { return <section className="management">{children}<SiteNotice writing /></section>; }
function Tree({ docs, parent = null, current, select, actions, depth = 0 }) {
  const [collapsed, setCollapsed] = useState({});
  const items = docs.filter((d) => ((d.parentId && docs.some((p) => p.id === d.parentId) ? d.parentId : null)) === parent).sort(compareDirectoryEntries);
  return <div className="tree-level">{items.map((d) => {
    const hasChildren = docs.some((c) => c.parentId === d.id);
    const Icon = d.kind === 'folder' ? Folder : FileText;
    return <div key={d.id}><div className={`tree-row ${current === d.id ? 'selected' : ''}`} style={{ paddingLeft: 8 + depth * 17 }}>
      {hasChildren ? <button className="tree-toggle" aria-label={`${collapsed[d.id] ? '展开' : '收起'}${d.title}`} aria-expanded={!collapsed[d.id]} onClick={() => setCollapsed({ ...collapsed, [d.id]: !collapsed[d.id] })}>{collapsed[d.id] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}</button> : <span className="tree-toggle-space" />}
      <button className="tree-document" onClick={() => select(d.id)} aria-current={current === d.id ? 'page' : undefined}><Icon size={17} /><span>{d.title}</span></button>{actions && <TreeDocumentActions document={d} {...actions} />}
    </div>{hasChildren && !collapsed[d.id] && depth < 12 && <Tree docs={docs} parent={d.id} current={current} select={select} actions={actions} depth={depth + 1} />}</div>;
  })}</div>;
}
function Login({ session, hasBackend, login, toast }) {
  return <main className="login-page"><div className="login-brand"><BookOpenText size={30} className="brand-icon" /><strong>Sphinx</strong><BetaBadge /></div><h1>一起把经验写下来</h1><p>受邀创作伙伴可管理文章、目录和图片。<br />登录后从共享草稿开始。</p>
    {session.githubConfigured ? <a className="primary button" href="/auth/github" onClick={() => { if (location.hash.startsWith("#/write/") && safeReturn(location.hash)) sessionStorage.setItem('guide-login-target', location.hash); }}>使用 GitHub 登录<ArrowUpRight size={17} /></a> : <div className="notice">{hasBackend ? '正式 GitHub 登录尚未配置。' : '这里是公开阅读站。创作伙伴请使用站主提供的工作台地址。'}</div>}
    {session.localDemo && <div className="local-login"><strong>本地演示</strong><p>仅在本机模拟角色，用于试用编辑与审核。</p><div className="button-row"><button onClick={() => login('owner')}>以站主身份体验</button><button onClick={() => login('editor')}>以伙伴身份体验</button></div></div>}
    <a className="quiet-link" href="#/read"><ArrowLeft size={15} />返回阅读站</a>
    <ThemeSwitcher /><SiteNotice />
  </main>;
}
export default function App() {
  const compact = useMediaQuery('(max-width: 900px)');
  const [session, setSession] = useState({}); const [booting, setBooting] = useState(true); const [hasBackend, setHasBackend] = useState(false);
  const [route, setRoute] = useState(location.hash || '#/read'); const destination = parseRoute(route); const writing = destination.writing;
  const routeRef = useRef(route); const routeSequence = useRef(0);
  const [docs, setDocs] = useState([]); const [publicDocs, setPublicDocs] = useState([]); const [current, setCurrent] = useState(null); const [doc, setDoc] = useState(null);
  const [view, setView] = useState('editor'); const [query, setQuery] = useState(''); const [status, setStatus] = useState('saved'); const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false); const [loadError, setLoadError] = useState(''); const [message, setMessage] = useState(null); const [dialog, setDialog] = useState(null);
  const [reviews, setReviews] = useState([]); const [members, setMembers] = useState([]); const [assets, setAssets] = useState([]); const [events, setEvents] = useState([]);
  const [selected, setSelected] = useState([]); const [sideOpen, setSideOpen] = useState(() => !compact); const [more, setMore] = useState(false);
  const sidebarRef = useRef(); const focusSearch = useRef(false);
  const imageLibraryInput = useRef(); const editorRef = useRef(); const toastTimer = useRef(); const searchRef = useRef(); const loadSequence = useRef(0);
  function toast(text, error = false) { setMessage({ text, error }); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setMessage(null), 6000); }
  async function refreshSession() { try { const s = await api('/api/session'); setSession(s); setCsrf(s.csrf); setHasBackend(true); const target = sessionStorage.getItem('guide-login-target'); if (s.user && target?.startsWith('#/write/') && safeReturn(target)) { sessionStorage.removeItem('guide-login-target'); location.hash = target; } return s; } catch { setHasBackend(false); return {}; } }
  useEffect(() => { refreshSession().finally(() => setBooting(false)); }, []);
  useEffect(() => {
    const keyboard = e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const referenceSearch = document.querySelector('.reference-page .reference-search input');
        if (compact && sideOpen) searchRef.current?.focus();
        else if (referenceSearch) referenceSearch.focus();
        else if (!sideOpen) { focusSearch.current = true; setSideOpen(true); }
        else searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, [compact, sideOpen]);
  useEffect(() => {
    const change = async () => {
      const next = location.hash || '#/read'; const previous = routeRef.current; const sequence = ++routeSequence.current;
      try {
        if (next === previous) return;
        await editorRef.current?.flush();
        if (sequence !== routeSequence.current) return;
        if (history.state?.sphinxRoute !== next) history.replaceState({ ...history.state, sphinxRoute: next, sphinxFrom: previous }, '', next);
        routeRef.current = next; setRoute(next); setMore(false); if (compact) setSideOpen(false);
      } catch (error) { if (sequence === routeSequence.current) { history.replaceState({ ...history.state, sphinxRoute: previous, sphinxFrom: null }, '', previous); toast(error.message, true); } }
    };
    window.addEventListener('hashchange', change); return () => window.removeEventListener('hashchange', change);
  }, [compact]);
  useEffect(() => { setSideOpen(!compact); }, [compact]);
  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;
    if (compact) { if (sideOpen && !sidebar.open) sidebar.showModal(); else if (!sideOpen && sidebar.open) sidebar.close(); }
    if (sideOpen && focusSearch.current) { searchRef.current?.focus(); focusSearch.current = false; }
  }, [compact, sideOpen, booting, writing, session.user?.id]);
  function closeMobileNavigation() { if (compact) setSideOpen(false); }
  async function loadPublic() {
    try { const catalog = hasBackend ? await api('/api/public/catalog') : await fetch(new URL('catalog.json', document.baseURI), { cache: 'no-store' }).then((r) => { if (!r.ok) throw new Error('目录加载失败'); return r.json(); }); setPublicDocs(catalog.documents || []); setLoadError(''); return catalog.documents || []; }
    catch (e) { setLoadError('公开目录暂时无法加载，请稍后重试'); return []; }
  }
  async function refreshDocs() { const r = await api('/api/documents'); setDocs(r.documents); return r.documents; }
  async function refreshReviews() { const r = await api('/api/reviews'); setReviews(r.reviews); }
  useEffect(() => {
    if (booting) return;
    let cancelled = false;
    const enter = async () => {
      if (writing && session.user) {
        const list = await refreshDocs(); if (cancelled) return;
        if (['members', 'settings'].includes(destination.view) && session.user.role !== 'owner') { location.hash = '#/write/home'; setView('home'); toast('这项操作仅站主可执行', true); return; }
        if (destination.view !== 'editor') {
          setView(destination.view);
          if (destination.view === 'reviews') await refreshReviews();
          if (destination.view === 'about') await loadPublic();
          if (destination.view === 'members') { const result = await api('/api/members'); if (!cancelled) setMembers(result.members); }
          if (destination.view === 'assets') { const result = await api('/api/assets'); if (!cancelled) setAssets(result.assets); }
          if (destination.view === 'settings') { const result = await api('/api/audit'); if (!cancelled) setEvents(result.events); }
        } else {
          const target = destination.id || (list.some(d => d.id === current) ? current : list.find(d => d.kind === 'document')?.id || list[0]?.id);
          if (target && (doc?.id !== target || view !== 'editor' || doc?.editorSection !== (destination.section || 'reference'))) await openDocument(target, false, destination.section || 'reference');
          else if (target) setView('editor');
        }
        refreshReviews().catch(() => {});
      } else if (!writing) {
        const list = await loadPublic(); if (cancelled) return;
        const pool = list.filter(d => ['references', 'valhalla'].includes(destination.view) ? d.kind === 'reference' && (destination.view !== 'valhalla' || hasValhalla(d)) : d.kind !== 'reference' && (!isAboutDocument(d) || (isContributorsDocument(d) && destination.id === d.id)));
        setCurrent(destination.id ? (pool.some(d => d.id === destination.id) ? destination.id : null) : ['references', 'valhalla'].includes(destination.view) ? null : pool.find(d => d.kind !== 'folder')?.id || pool[0]?.id || null);
      }
    };
    enter().catch(error => { if (!cancelled) setLoadError(error.message); });
    return () => { cancelled = true; loadSequence.current++; };
  }, [booting, writing, session.user?.id, hasBackend, route]);
  async function run(work) { if (busy) return; setBusy(true); try { await work(); } catch (e) { toast(e.message, true); } finally { setBusy(false); } }
  async function flush() { if (editorRef.current) await editorRef.current.flush(); }
  async function openDocument(id, save = true, section = 'reference') {
    const sequence = ++loadSequence.current;
    try { if (save) await flush(); setLoadError(''); const r = await api(`/api/documents/${id}`); if (sequence !== loadSequence.current) return; if (section === 'valhalla' && !hasValhalla(r.document)) { location.hash = documentRoute(r.document); toast('请先在 Reference 词条中勾选“同步到 Valhalla”', true); return; } setDoc({ ...r.document, editorSection: section, editorKey: sequence }); setCurrent(id); setView('editor'); setStatus('saved'); setPreview(false); setMore(false); closeMobileNavigation(); if (save) location.hash = documentRoute({ ...r.document, section }); }
    catch (e) { toast(e.message, true); }
  }
  async function navigate(next) { await run(async () => { await flush(); closeMobileNavigation(); location.hash = next === 'references' ? '#/write/reference' : `#/write/${next}`; }); }
  const previousRoute = history.state?.sphinxRoute === route && safeReturn(history.state?.sphinxFrom) && history.state.sphinxFrom !== route && history.state.sphinxFrom !== '#/write' ? history.state.sphinxFrom : null;
  const backFallback = destination.section === 'valhalla' ? '#/write/valhalla' : destination.view === 'valhalla' ? '#/valhalla' : writing ? doc?.kind === 'reference' ? '#/write/reference' : '#/write/documents' : '#/reference';
  async function goBack() { await run(async () => { await flush(); if (previousRoute) history.back(); else location.hash = backFallback; }); }
  function browseTag(tag) { const valhalla = destination.view === 'valhalla'; selectReferenceTag(false, tag, valhalla); location.hash = valhalla ? '#/valhalla' : '#/reference'; }
  function openSearchEntry(entry) { if (writing) run(() => openDocument(entry.id)); else { closeMobileNavigation(); location.hash = isProjectDocument(entry) ? '#/about' : `#/${entry.kind === 'reference' ? 'reference' : 'read'}/${entry.id}`; } }
  async function login(role) { await run(async () => { await post('/api/local-session', { role }); await refreshSession(); }); }
  async function logout() { await run(async () => { await flush(); await post('/api/logout'); setSession({ ...session, user: null }); setDoc(null); setDocs([]); setCurrent(null); setMembers([]); setReviews([]); setAssets([]); setEvents([]); setSelected([]); setQuery(''); setMore(false); setDialog(null); setLoadError(''); }); }
  function saved(next) { setDocs((list) => list.map((d) => d.id === next.id ? { ...d, ...next, blocks: undefined } : d)); setDoc((d) => d?.id === next.id ? { ...d, ...next } : d); }
  async function create(input) { await run(async () => { await flush(); const r = await post('/api/documents', input.kind === 'reference' ? { ...input, parentId: null } : input); await refreshDocs(); setDialog(null); await openDocument(r.document.id, false); location.hash = documentRoute(r.document); toast(input.kind === 'reference' ? '词条已创建，可以开始编辑' : input.kind === 'folder' ? '目录已创建' : '文档已创建，可以开始写作'); }); }
  async function publishCurrent() { await run(async () => { if (!editorRef.current) return; const result = await editorRef.current.publish(); const list = await refreshDocs(); setDoc((d) => ({ ...d, ...list.find((r) => r.id === d.id) })); toast(result.localDemo ? '已发布到本地阅读站。线上发布将在部署后启用。' : '内容已提交到 GitHub，阅读站将在构建完成后更新'); }); }
  async function requestReview(action, ids, parentId = null) { await run(async () => { await flush(); await post('/api/reviews', { action, ids, parentId }); await refreshReviews(); setDialog(null); setSelected([]); toast('已提交，等待站主审核'); }); }
  async function openDirectoryOrder(parent) { await run(async () => { await flush(); const list = await refreshDocs(); setMore(false); closeMobileNavigation(); setDialog({ type: 'order', documents: list, parentId: typeof parent === 'string' || parent === null ? parent : doc?.kind !== 'reference' && !isAboutDocument(doc || {}) ? doc?.parentId : null }); }); }
  async function openDelete(ids) {
    await run(async () => { await flush(); const list = await refreshDocs(); const existing = ids.filter(id => list.some(item => item.id === id)); if (!existing.length) { toast('这些内容已被移除，请查看最新列表', true); return; } if (existing.length !== ids.length) { toast('列表已变化，请重新选择需要删除的内容', true); return; } setMore(false); closeMobileNavigation(); setDialog({ type: 'delete', ids: existing, documents: list }); });
  }
  async function deleteCompleted(removedIds, approved) {
    await refreshDocs(); await refreshReviews(); setSelected([]); setDialog(null);
    if (approved) {
      if (removedIds.includes(doc?.id)) { setDoc(null); setCurrent(null); location.hash = doc.kind === 'reference' ? '#/write/reference' : '#/write/documents'; }
      await loadPublic();
    }
    toast(approved ? '文档已删除，公开阅读站将在构建后同步移除' : '删除申请已提交，等待站主审核');
  }
  async function applyDirectoryOrder(input) {
    if (busy) return;
    setBusy(true); let applied = false;
    try {
      await flush();
      await post(session.user.role === 'owner' ? '/api/directory/order' : '/api/reviews', { ...input, ...(session.user.role === 'owner' ? {} : { action: 'reorder' }) });
      applied = true; setDialog(null);
      const list = await refreshDocs(); await refreshReviews();
      if (session.user.role === 'owner' && view === 'editor' && doc && list.find(row => row.id === doc.id)?.version !== doc.version) await openDocument(doc.id, false);
      toast(session.user.role === 'owner' ? '目录顺序已保存，公开阅读站将在构建后更新' : '排序已提交，等待站主审核');
    } catch (e) { if (applied) toast('排序已保存，但列表刷新未完成，请重新打开工作台查看', true); else throw e; }
    finally { setBusy(false); }
  }
  const activeDocs = (writing ? docs : publicDocs).filter(d => d.kind !== 'reference' && !isAboutDocument(d));
  const aboutPage = destination.view === 'about';
  const contributorsPage = !writing && destination.view === 'reader' && destination.id === CONTRIBUTORS_DOCUMENT_ID;
  const projectIntroduction = publicDocs.find(isProjectDocument);
  const projectDraft = docs.find(isProjectDocument);
  const contributors = publicDocs.find(isContributorsDocument);
  const contributorsDraft = docs.find(isContributorsDocument);
  async function editAboutDocument(id, existingDraft, initializePath) { await run(async () => { await flush(); if (!existingDraft) { await post(initializePath); await refreshDocs(); } await openDocument(id, false); location.hash = `#/write/documents/${id}`; }); }
  const publicDoc = publicDocs.find((d) => d.id === current && d.kind !== 'reference');
  const isOwner = session.user?.role === 'owner';
  const valhallaMode = destination.section === 'valhalla';
  const valhallaPage = !writing && destination.view === 'valhalla';
  const referencesPage = !writing && ['references', 'valhalla'].includes(destination.view);
  const sourceReference = publicDocs.find(d => d.id === current && d.kind === 'reference');
  const publicReference = valhallaPage ? (hasValhalla(sourceReference) ? valhallaDocument(sourceReference) : null) : sourceReference;
  const referenceEntries = (writing ? docs : publicDocs).filter(d => d.kind === 'reference');
  const referenceProps = { entries: referenceEntries, ...(writing ? { onOpen: id => run(() => openDocument(id)), onCreate: () => setDialog({ type: 'create', kind: 'reference' }), ...(isOwner ? { onInitialize: () => run(async () => { await post('/api/references/initialize'); await refreshDocs(); await loadPublic(); toast('原有内容已迁移为可编辑词条'); }) } : {}) } : {}) };
  const valhallaProps = { valhalla: true, entries: referenceEntries.filter(hasValhalla).map(valhallaDocument), ...(writing ? { onOpen: id => run(() => openDocument(id, true, 'valhalla')) } : {}) };
  if (booting) return <div className="startup"><Loader2 className="spin" />正在打开 Sphinx…</div>;
  if (writing && !session.user) return <><Login session={session} hasBackend={hasBackend} login={login} toast={toast} />{message && <div className={`toast ${message.error ? 'error' : ''}`} role="status">{message.text}</div>}</>;
  const Sidebar = compact ? 'dialog' : 'aside';
  return <div className={`app-shell ${sideOpen ? '' : 'sidebar-closed'} ${writing ? 'writing-shell' : ''}`}>
    {!writing && !aboutPage && <PageBackground key={`${destination.view}:${destination.id || route}`} document={referencesPage ? (destination.id === publicReference?.id ? publicReference : null) : (!destination.id || destination.id === publicDoc?.id ? publicDoc : null)} />}
    <Sidebar ref={sidebarRef} id="site-navigation" className="sidebar" aria-label={compact ? '网站导航' : undefined} onCancel={compact ? e => { e.preventDefault(); setSideOpen(false); } : undefined} onClick={compact ? e => {
      if (e.target.closest('a')) closeMobileNavigation();
      if (e.target === sidebarRef.current) { const rect = e.currentTarget.getBoundingClientRect(); if (e.clientX > rect.right || e.clientY > rect.bottom || e.clientX < rect.left || e.clientY < rect.top) setSideOpen(false); }
    } : undefined}>
      {compact && <button className="icon-button navigation-close" aria-label="关闭导航" onClick={() => setSideOpen(false)}><X size={20} /></button>}
      <a className="brand" href="#/read" onClick={(e) => { if (writing) { e.preventDefault(); run(async () => { await flush(); location.hash = '/read'; }); } }}><BookOpenText size={27} className="brand-icon" /><span>Sphinx<BetaBadge /></span></a>
      <div className="sidebar-content"><div className="search-box"><Search size={17} /><input ref={searchRef} placeholder="搜索指南、词条或标签" maxLength={160} value={query} onChange={(e) => setQuery(e.target.value)} aria-label="搜索文档" onKeyDown={event => { if (event.nativeEvent.isComposing) return; if (event.key === 'Escape' && query) { event.preventDefault(); event.stopPropagation(); setQuery(''); } if (event.key === 'ArrowDown') { event.preventDefault(); document.querySelector('.site-search-result')?.focus(); } if (event.key === 'Enter') { const entry = searchEntries(writing ? docs : publicDocs, query)[0]?.entry; if (entry && query.trim()) openSearchEntry(entry); } }} />{query ? <button className="search-clear" aria-label="清空全站搜索" onClick={() => { setQuery(''); searchRef.current?.focus(); }}><X size={14} /></button> : <kbd>Ctrl K</kbd>}</div>
        {writing ? <nav className="main-nav" aria-label="工作台导航">{[['home', House, '工作台'], ['documents', Files, '全部文档'], ['reviews', Clock3, '待审核'], ['assets', Images, '图片库'], ['authors', Users, '作者索引'], ['references', BookOpenText, 'Reference'], ['valhalla', Swords, 'Valhalla'], ['about', Info, '关于与联系'], ...(isOwner ? [['members', Users, '协作成员']] : [])].map(([key, Icon, label]) => <button key={key} className={view === key || (view === 'editor' && doc?.kind === 'reference' && key === (doc.editorSection === 'valhalla' ? 'valhalla' : 'references')) ? 'active' : ''} onClick={() => navigate(key)}><Icon size={19} /><span>{label}</span>{key === 'reviews' && reviews.filter((r) => r.status === 'pending').length > 0 && <span className="count">{reviews.filter((r) => r.status === 'pending').length}</span>}</button>)}</nav> : <><div className="reader-intro"><BookOpenText size={18} /><span>写给 Agent 初学者</span></div><nav className="main-nav reader-nav" aria-label="阅读导航"><a className={!referencesPage && !aboutPage ? 'active' : ''} href="#/read" aria-current={!referencesPage && !aboutPage ? 'page' : undefined}><FileText size={18} />指南</a><a className={referencesPage && !valhallaPage ? 'active' : ''} href="#/reference" aria-current={referencesPage && !valhallaPage ? 'page' : undefined}><BookOpenText size={18} />Reference</a><a className={valhallaPage ? 'active' : ''} href="#/valhalla" aria-current={valhallaPage ? 'page' : undefined}><Swords size={18} />Valhalla</a><a className={aboutPage ? 'active' : ''} href="#/about" aria-current={aboutPage ? 'page' : undefined}><Info size={18} />关于与联系</a></nav></>}
        <div className="directory-heading"><h2>{query ? '搜索结果' : '目录'}</h2>{writing && <div className="directory-heading-actions"><button className="directory-order-open" type="button" aria-label="调整目录顺序" disabled={busy} onClick={openDirectoryOrder}><ListOrdered size={15} />排序</button><IconButton label="新建文档或目录" icon={Plus} onClick={() => { closeMobileNavigation(); setDialog({ type: 'create' }); }} /></div>}</div>
        {query.trim() ? <SearchResults entries={writing ? docs : publicDocs} query={query} onSelect={openSearchEntry} /> : <>
          <Tree docs={activeDocs} actions={writing ? { busy, onSort: item => openDirectoryOrder(item.parentId || null), onMove: item => run(async () => { await flush(); closeMobileNavigation(); setDialog({ type: 'move', ids: [item.id] }); }), onDelete: item => openDelete([item.id]) } : undefined} current={aboutPage || referencesPage || (writing && view !== 'editor') ? null : current} select={id => writing ? run(() => openDocument(id)) : (location.hash = `/read/${id}`)} />
          {!activeDocs.length && <p className="sidebar-empty">{writing ? '还没有文档，点击 + 开始创作。' : '作者正在准备第一篇指南。'}</p>}
          <Tree docs={[{ id: CONTRIBUTORS_DOCUMENT_ID, title: '参与者与致谢', kind: 'document' }]} current={contributorsPage || (writing && view === 'editor' && current === CONTRIBUTORS_DOCUMENT_ID) ? CONTRIBUTORS_DOCUMENT_ID : null} select={() => writing ? contributorsDraft || isOwner ? editAboutDocument(CONTRIBUTORS_DOCUMENT_ID, contributorsDraft, '/api/contributors/initialize') : navigate('about') : (location.hash = `/read/${CONTRIBUTORS_DOCUMENT_ID}`)} />
        </>}
      </div>
      <div className="sidebar-utilities"><ThemeSwitcher /><button className="support-nav" onClick={() => run(async () => { await flush(); closeMobileNavigation(); location.hash = writing ? '#/write/about?section=support' : '#/about?section=support'; })}><Heart size={16} />支持我们</button></div>
      {(writing || session.user) && <div className="sidebar-bottom">{writing ? <><div className="user-info"><span className="avatar">{session.user.login.slice(0, 1).toUpperCase()}</span><div><strong>{session.user.login}</strong><small>{isOwner ? '站主' : '创作伙伴'}{session.localDemo ? ' · 本地演示' : ''}</small></div><IconButton label="退出登录" icon={LogOut} onClick={logout} disabled={busy} /></div>{isOwner && <button className="settings-link" onClick={() => navigate('settings')}><Settings2 size={15} />发布与操作记录</button>}</> : <a className="partner-link" href="#/write">返回创作工作台<ArrowUpRight size={17} /></a>}</div>}
    </Sidebar>
    <main className="main-shell">
      <header className="topbar"><div className="breadcrumb"><IconButton label={compact ? sideOpen ? '关闭导航' : '打开导航' : sideOpen ? '收起侧栏' : '展开侧栏'} icon={sideOpen ? PanelLeftClose : PanelLeftOpen} aria-expanded={sideOpen} aria-controls="site-navigation" onClick={() => setSideOpen(!sideOpen)} /><span>{writing ? '创作空间' : '指南'}</span><span className="path-divider">/</span><strong>{aboutPage ? '关于与联系' : writing ? view === 'editor' ? doc ? `${doc.title}${valhallaMode ? ' · Valhalla' : ''}` : '开始创作' : ({ home: '工作台', documents: '全部文档', reviews: '待审核', members: '协作成员', assets: '图片库', authors: '作者索引', references: 'Reference', valhalla: 'Valhalla', settings: '发布与操作记录' })[view] : referencesPage ? publicReference ? `${publicReference.title}${valhallaPage ? ' · Valhalla' : ''}` : valhallaPage ? 'Valhalla' : 'Reference' : contributorsPage ? '参与者与致谢' : publicDoc?.title || '欢迎阅读'}</strong>{(compact || !sideOpen) && <BetaBadge />}</div>
        <div className="top-actions">{writing && view === 'editor' && doc ? <><div className="save-state" aria-live="polite">{status === 'saving' ? <Loader2 size={16} className="spin" /> : status === 'saved' ? <CheckCircle2 size={16} /> : <Circle size={14} />}<span>{({ saved: '已保存', saving: '正在保存', dirty: '未保存', error: '保存失败' })[status]}</span></div><Status doc={doc} /><button onClick={() => run(async () => { await flush(); setPreview(!preview); })}><Eye size={16} />{preview ? '返回编辑' : '预览'}</button><button className="primary" disabled={busy || status === 'error'} onClick={publishCurrent}><Upload size={16} />{busy ? '处理中…' : doc.publishedVersion ? '更新发布' : '发布'}</button><div className="more-wrap"><IconButton label="更多文档操作" icon={MoreHorizontal} onClick={() => setMore(!more)} />{more && <div className="menu-popover"><button onClick={() => run(async () => { await flush(); setDialog({ type: 'history', revisions: (await api(`/api/documents/${doc.id}/history`)).revisions }); setMore(false); })}><History size={16} />历史版本</button><button onClick={() => { setDialog({ type: 'move', ids: [doc.id] }); setMore(false); }}><Folder size={16} />调整目录</button><button onClick={() => downloadJson(`${doc.title}.json`, editorRef.current.snapshot())}><Download size={16} />导出当前草稿</button>{doc.kind !== 'reference' && !isAboutDocument(doc) && <button disabled={busy} onClick={() => openDirectoryOrder(doc.parentId || null)}><ListOrdered size={16} />调整顺序</button>}<button className="danger-text" disabled={busy} onClick={() => openDelete([doc.id])}><Trash2 size={16} />{isOwner ? '删除文档' : '申请删除'}</button></div>}</div></> : writing ? view === 'references' || view === 'valhalla' || view === 'authors' || aboutPage ? null : <button className="primary" onClick={() => setDialog({ type: 'create', ...(view === 'references' ? { kind: 'reference' } : {}) })}><Plus size={16} />{view === 'references' ? '新建词条' : '新建文档'}</button> : <>{publicReference && referencesPage && session.user && hasBackend && <a className="button" href={`#/write/${valhallaPage ? 'valhalla' : 'reference'}/${publicReference.id}`}>{valhallaPage ? '编辑评测' : '编辑词条'}</a>}<button onClick={async () => { try { await navigator.clipboard.writeText(location.href); toast('阅读链接已复制'); } catch { toast('请复制浏览器地址栏中的阅读链接', true); } }}><ExternalLink size={16} />分享本页</button></>}</div>
      </header>
      {loadError && <div className="inline-error" role="alert">{loadError}<button onClick={() => writing ? refreshDocs().catch((e) => toast(e.message, true)) : loadPublic()}>重新加载</button></div>}
      <ScrollBoundary routeKey={route} entries={publicDocs}>
      {aboutPage ? <About document={projectIntroduction} writing={writing} hasDraft={!!projectDraft} onEdit={writing && (isOwner || projectDraft) ? () => editAboutDocument(PROJECT_DOCUMENT_ID, projectDraft, '/api/project/initialize') : undefined} contributors={contributors} hasContributorsDraft={!!contributorsDraft} onEditContributors={writing && (isOwner || contributorsDraft) ? () => editAboutDocument(CONTRIBUTORS_DOCUMENT_ID, contributorsDraft, '/api/contributors/initialize') : undefined} busy={busy} /> : writing ? <>
        {view === 'editor' && (doc ? <Suspense fallback={<div className="startup"><Loader2 className="spin" />正在打开编辑器…</div>}><Editor key={`${doc.id}:${doc.editorKey}`} ref={editorRef} document={doc} user={session.user} referenceEntries={referenceEntries} section={doc.editorSection} onReferenceOpen={id => run(() => openDocument(id))} onBackReference={() => navigate(valhallaMode ? 'valhalla' : 'references')} onBack={goBack} backLabel={previousRoute ? '返回上一页' : valhallaMode ? '返回 Valhalla' : doc.kind === 'reference' ? '返回词条索引' : '返回全部文档'} onSaved={saved} onStatus={setStatus} preview={preview} toast={toast} /></Suspense> : <div className="reading-home"><div className="empty-state reference-welcome"><h1>从第一篇文档开始</h1><p>创建目录，写下你的经验，再发布给读者。</p><button className="primary" onClick={() => setDialog({ type: 'create' })}><Plus size={16} />新建文档</button></div><References {...referenceProps} /></div>)}
        {['references', 'valhalla'].includes(view) && <div className="reference-page"><References key={view} {...(view === 'valhalla' ? valhallaProps : referenceProps)} /></div>}
        {view === 'home' && <ManagementPage><h1>继续你的创作</h1><p className="section-description">所有伙伴共享草稿。保存用于保留进度，发布后读者才能看到。</p><div className="section-heading"><h2>最近更新</h2><button onClick={() => navigate('documents')}>查看全部<ChevronRight size={15} /></button></div><div className="document-list">{[...docs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8).map((d) => <button className="recent-row" key={d.id} onClick={() => openDocument(d.id)}><FileText size={19} /><div><strong>{d.title}</strong><small>{date(d.updatedAt)} 更新</small></div><Status doc={d} /><ChevronRight size={16} /></button>)}</div><div className="workspace-note"><Clock3 size={19} /><div><strong>删除与批量调整需要审核</strong><p>普通文章可自行发布。网站代码、成员与系统设置由站主管理。</p></div></div></ManagementPage>}
        {view === 'documents' && <ManagementPage><h1>全部文档</h1><p className="section-description">管理共享草稿和已发布内容，目录修改会在发布后公开。</p><div className="section-heading"><span>{docs.length} 篇文档和目录</span><div className="button-row"><button disabled={!selected.length} onClick={() => setDialog({ type: 'move', ids: selected })}>批量调整</button><button disabled={busy} onClick={() => openDirectoryOrder(null)}><ListOrdered size={16} />排序</button><button disabled={busy || !selected.length} className="danger-text" onClick={() => openDelete(selected)}><Trash2 size={16} />{isOwner ? '删除所选' : '申请删除所选'}</button></div></div><ManagementTable><thead><tr><th><input type="checkbox" aria-label="选择全部文档" checked={!!docs.length && selected.length === docs.length} onChange={(e) => setSelected(e.target.checked ? docs.map((d) => d.id) : [])} /></th><th>名称</th><th>状态</th><th>更新时间</th><th>操作</th></tr></thead><tbody>{docs.map((d) => <tr key={d.id}><td><input type="checkbox" aria-label={`选择${d.title}`} checked={selected.includes(d.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, d.id] : selected.filter((id) => id !== d.id))} /></td><td><button className="table-title" onClick={() => openDocument(d.id)}>{d.kind === 'folder' ? <Folder size={17} /> : <FileText size={17} />}{d.title}</button></td><td><Status doc={d} /></td><td>{date(d.updatedAt)}</td><td className="document-row-actions"><button className="danger-text" disabled={busy} onClick={() => openDelete([d.id])}><Trash2 size={15} />{isOwner ? '删除' : '申请删除'}</button></td></tr>)}</tbody></ManagementTable></ManagementPage>}
        {view === 'reviews' && <ManagementPage><h1>待审核</h1><p className="section-description">站主确认后执行删除、目录排序和批量调整。内容发生变化的申请需要重新提交。</p>{!reviews.length && <div className="empty-state compact"><CheckCircle2 size={30} /><h2>目前没有审核申请</h2><p>删除、目录排序和批量调整的申请会出现在这里。</p></div>}{reviews.map((r) => <div className="review-row" key={r.id}><div className="section-heading"><h2>{r.action === 'delete' ? '删除文档' : r.action === 'reorder' ? '调整目录顺序' : '批量调整目录'}<span className="status-tag">{({ pending: '待审核', approved: '已通过', rejected: '已驳回' })[r.status]}</span></h2><small>{date(r.created_at)}</small></div><p>{r.payload.titles.join(r.action === 'reorder' ? ' → ' : '、')}</p><small>由 {r.actor} 提交 · 共 {r.payload.ids.length} 项</small>{r.action === 'delete' && <p className="review-warning">删除会移除公开目录与工作台中的文档。已发布到 GitHub 的历史文件和缓存仍可能保留。</p>}{isOwner && r.status === 'pending' && <div className="button-row"><button className="primary" disabled={busy} onClick={() => run(async () => { await post(`/api/reviews/${r.id}/approve`); await refreshReviews(); const list = await refreshDocs(); if (!list.some((d) => d.id === current)) { setDoc(null); setCurrent(null); } toast('申请已通过并执行'); })}>批准并执行</button><button disabled={busy} onClick={() => run(async () => { await post(`/api/reviews/${r.id}/reject`); await refreshReviews(); toast('申请已驳回'); })}>驳回申请</button></div>}</div>)}</ManagementPage>}
        {view === 'authors' && <ManagementPage><Authors ref={editorRef} toast={toast} /></ManagementPage>}
        {view === 'members' && <ManagementPage><h1>协作成员</h1><p className="section-description">邀请 GitHub 账号成为创作伙伴。伙伴可以管理全部内容并发布普通文章。</p><div className="workspace-invite"><p>先添加 GitHub 账号，再把工作台链接发给伙伴。持有链接本身不会取得权限。</p><button onClick={() => run(async () => { try { await navigator.clipboard.writeText(new URL("/#/write", location.href).href); toast("伙伴工作台链接已复制"); } catch { toast("请复制浏览器地址栏中的工作台地址，将页面路径改为 #/write", true); } })}>复制伙伴工作台入口</button></div><form className="invite-form" onSubmit={(e) => { e.preventDefault(); const form = e.currentTarget; const login = new FormData(form).get('login'); run(async () => { await post('/api/members', { login }); setMembers((await api('/api/members')).members); form.reset(); toast('邀请已生效，伙伴可使用 GitHub 登录'); }); }}><label htmlFor="github-login">GitHub 用户名</label><div className="button-row"><input id="github-login" name="login" required placeholder="例如 octocat" autoComplete="off" /><button className="primary" disabled={busy}>添加伙伴</button></div></form><div className="member-owner"><span className="avatar">{session.user.login[0]}</span><div><strong>{session.user.login}</strong><small>站主 · 全部管理权限</small></div></div>{members.map((m) => <div className="member-row" key={m.github_id}><span className="avatar">{m.login[0]}</span><div><strong>{m.login}</strong><small>{m.active ? '创作伙伴' : '已停用'}</small></div>{!!m.active && <button disabled={busy} onClick={() => run(async () => { await post(`/api/members/${m.github_id}/deactivate`); setMembers((await api('/api/members')).members); toast('成员已停用，登录会话已撤销'); })}>停用权限</button>}</div>)}</ManagementPage>}
        {view === 'assets' && <ManagementPage><h1>图片库</h1><p className="section-description">上传图片可在文档中引用。草稿图片仅受邀伙伴可见，随文章发布后公开。</p><button onClick={() => imageLibraryInput.current.click()}><ImageIcon /><span>上传图片</span></button><input ref={imageLibraryInput} type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden onChange={(e) => { const f = e.target.files[0]; if (f) run(async () => { await api('/api/assets', { method: 'POST', body: f }); setAssets((await api('/api/assets')).assets); toast('图片已上传到私有图片库'); }); e.target.value = ''; }} />{!assets.length && <div className="empty-state compact"><Images size={32} /><h2>还没有图片</h2><p>也可以在编辑器中直接粘贴截图。</p></div>}<div className="asset-grid">{assets.map((a) => <figure key={a.id}><img src={`/api/assets/${a.id}`} alt="已上传的文章素材" /><figcaption><span>{a.public_at ? '已公开' : '私有草稿'}</span><small>{Math.ceil(a.size / 1024)} KB</small></figcaption><button onClick={() => run(async () => { await navigator.clipboard.writeText(`/api/assets/${a.id}`); toast('图片路径已复制，可在图片块的嵌入地址中使用'); })}>复制图片路径</button></figure>)}</div></ManagementPage>}
        {view === 'settings' && <ManagementPage><h1>发布与操作记录</h1><p className="section-description">仅站主可见。发布状态不明确时，先恢复状态再继续发布。</p><div className="settings-row"><div><h2>GitHub 登录</h2><p>{session.githubConfigured ? '已配置服务端登录' : '尚未配置 OAuth App'}</p></div><span className="status-tag">{session.localDemo ? '本地演示' : session.githubConfigured ? '已配置' : '待配置'}</span></div><div className="settings-row"><div><h2>内容发布</h2><p>{session.localDemo ? '发布只更新本机演示阅读站。' : session.publishingConfigured ? '发布到独立 GitHub 仓库，自动构建公开阅读站。' : '需要独立仓库及服务端发布凭证。'}</p></div><button disabled={busy} onClick={() => run(async () => { const r = await post('/api/reconcile'); toast(`发布状态已确认，恢复 ${r.recovered} 项`); })}>恢复发布状态</button></div><h2 className="audit-heading">最近操作</h2><ManagementTable><thead><tr><th>时间</th><th>操作者</th><th>操作</th></tr></thead><tbody>{events.map((e) => <tr key={e.id}><td>{date(e.created_at)}</td><td>{e.actor}</td><td>{e.action}</td></tr>)}</tbody></ManagementTable></ManagementPage>}
      </> : referencesPage && publicReference ? <ReferenceReading document={publicReference} valhalla={valhallaPage} previousRoute={previousRoute} onBack={goBack} onTag={browseTag} /> : referencesPage ? <div className="reference-page">{destination.id && <p className="reference-not-found" role="status">{valhallaPage ? '评测未找到、尚未同步或尚未发布。' : '词条未找到或尚未发布。'}</p>}<References key={valhallaPage ? 'valhalla' : 'reference'} {...(valhallaPage ? valhallaProps : referenceProps)} /></div> : contributorsPage && !publicDoc ? <ReadingColumn documentId={CONTRIBUTORS_DOCUMENT_ID}><div className="document-paper public-paper"><h1 className="document-title">参与者与致谢</h1><p className="contributors-empty">参与者名单正在整理中。</p></div></ReadingColumn> : publicDoc ? <div className="document-layout"><ReadingColumn key={publicDoc.id} documentId={publicDoc.id}><div className="document-paper public-paper"><h1 className="document-title">{publicDoc.title}</h1><UpdatedAt document={publicDoc} /><Reader blocks={publicDoc.blocks} /></div>{!contributorsPage && <References {...referenceProps} compact />}</ReadingColumn><Outline blocks={publicDoc.blocks} /></div> : <div className="reading-home"><div className="empty-state reference-welcome"><h1>指南正在准备中</h1><p>这里将收录写给 Agent 初学者的经验与方法。<br />文章发布后会出现在左侧目录。</p>{session.user && hasBackend && <a href="#/write" className="button">进入创作工作台<ArrowUpRight size={16} /></a>}</div><References {...referenceProps} /></div>}
      </ScrollBoundary>
    </main>
    {dialog?.type === 'order' && <DirectoryOrderDialog documents={dialog.documents} initialParent={dialog.parentId} isOwner={isOwner} busy={busy} onSave={applyDirectoryOrder} onClose={() => setDialog(null)} />}
    {dialog?.type === 'delete' && <DeleteDocumentsDialog documents={dialog.documents} ids={dialog.ids} isOwner={isOwner} onClose={() => setDialog(null)} onComplete={deleteCompleted} onReview={() => { setDialog(null); navigate('reviews'); }} />}
    {dialog && !['order', 'delete'].includes(dialog.type) && <Dialog dialog={dialog} close={() => setDialog(null)} docs={docs} doc={doc} busy={busy} create={create} requestReview={requestReview} run={run} refreshDocs={refreshDocs} openDocument={openDocument} toast={toast} />}
    {message && <div className={`toast ${message.error ? 'error' : ''}`} role="status">{message.text}<button aria-label="关闭消息" onClick={() => setMessage(null)}><X size={15} /></button></div>}
  </div>;
}
function ImageIcon() { return <Images size={16} />; }
function Dialog({ dialog, close, docs, doc, busy, create, requestReview, run, refreshDocs, openDocument, toast }) {
  const ref = useRef();
  useEffect(() => { ref.current.showModal(); }, []);
  return <dialog ref={ref} className="dialog" onCancel={close} aria-labelledby="dialog-title"><div className="dialog-heading"><h2 id="dialog-title">{({ create: dialog.kind === 'reference' ? '新建词条' : '新建文档或目录', delete: '提交删除申请', move: '调整目录', history: '历史版本' })[dialog.type]}</h2><IconButton label="关闭" icon={X} onClick={close} /></div>
    {dialog.type === 'create' && <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); create({ title: f.get('title'), kind: f.get('kind'), parentId: f.get('parentId') || null }); }}><label>名称<input name="title" required maxLength={160} autoFocus placeholder="写一个清楚的标题" /></label>{dialog.kind === 'reference' ? <input type="hidden" name="kind" value="reference" /> : <><label>类型<select name="kind" defaultValue="document"><option value="document">文档</option><option value="folder">目录（可填写说明）</option><option value="reference">Reference 词条</option></select></label><label>所属目录<select name="parentId"><option value="">顶层目录</option>{docs.filter(d => d.kind !== 'reference').map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}</select></label></>}<div className="dialog-actions"><button type="button" onClick={close}>取消</button><button className="primary" disabled={busy}>创建</button></div></form>}
    {dialog.type === 'move' && <form onSubmit={(e) => { e.preventDefault(); requestReview('bulkMove', dialog.ids, new FormData(e.currentTarget).get('parentId') || null); }}><p>调整 {dialog.ids.length} 项内容的所属目录，提交后由站主审核。</p><label>移动到<select name="parentId"><option value="">顶层目录</option>{docs.filter((d) => !dialog.ids.includes(d.id)).map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}</select></label><div className="dialog-actions"><button type="button" onClick={close}>取消</button><button className="primary" disabled={busy}>提交审核</button></div></form>}
    {dialog.type === 'history' && <><p>恢复历史版本会生成新的草稿，公开文章需要再次发布。</p>{!dialog.revisions.length && <p className="muted">还没有历史版本，首次保存修改后会在这里保留记录。</p>}<div className="history-list">{dialog.revisions.map((r) => <div key={r.id}><span><strong>版本 {r.version} · {r.title}</strong><small>{date(r.created_at)} · {r.actor}</small></span><button disabled={busy} onClick={() => run(async () => { await post(`/api/documents/${doc.id}/restore`, { revisionId: r.id, version: doc.version }); await refreshDocs(); close(); await openDocument(doc.id, false, doc.editorSection); toast('历史版本已恢复为新草稿'); })}>恢复到草稿</button></div>)}</div></>}
  </dialog>;
}
