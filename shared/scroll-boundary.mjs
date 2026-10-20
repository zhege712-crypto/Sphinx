export function boundaryForScroll({ scrollTop, scrollHeight, clientHeight }, delta) {
  if (!Number.isFinite(delta) || delta === 0 || clientHeight <= 0) return null;
  if (delta < 0 && scrollTop <= 1) return 'top';
  if (delta > 0 && scrollTop + clientHeight >= scrollHeight - 1) return 'bottom';
  return null;
}

const fallbackWords = ['Sphinx', 'Agent', 'Reference', 'Prompt', '探索', '理解', '实践', '创造', '分享', '灵感', '知识', '继续生长', '学习', '经验', '文档', '开源', '协作', '思考', '提问', '阅读', '写作', '工具', '模型', '上下文', '工作流', '连接', '发现', '尝试', '记录', '研究', '好奇心', '小步前进', '从这里开始', '代码', '指南', '构建', '想象力', '行动', '积累', '交流'];
export function boundaryWords(entries = []) {
  const words = [...new Set(entries.filter(entry => entry.kind === 'reference' && (entry.publishedAt || entry.publishedVersion))
    .map(entry => String(entry.title || '').trim()).filter(Boolean))];
  return [...new Set(['Sphinx', ...words, ...fallbackWords])].slice(0, 80);
}
