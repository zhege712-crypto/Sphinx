import { useMemo } from 'react';
import { FormattingToolbar, getFormattingToolbarItems, useComponentsContext, useEditorState } from '@blocknote/react';
import { BookOpenText } from 'lucide-react';
import { createTermIndex, exactTermMatches, preferredTermMatch } from '../shared/term-matches.mjs';
import './quick-term-link.css';

export default function QuickTermToolbar({ editor, entries, onOpen, onAssociate }) {
  const Components = useComponentsContext();
  const index = useMemo(() => createTermIndex(entries), [entries]);
  const target = useEditorState({ editor, selector: ({ editor: current }) => {
    const { selection, doc } = current.prosemirrorState;
    if (selection.empty || !selection.$from.parent.inlineContent || selection.$from.parent !== selection.$to.parent || selection.to - selection.from > 160) return null;
    return { text: current.getSelectedText(), from: selection.from, to: selection.to, doc };
  }, equalityFn: (a, b) => a === b || (a?.doc === b?.doc && a?.from === b?.from && a?.to === b?.to) });
  const text = target?.text || '';
  const matches = exactTermMatches(index, text);
  const preferred = preferredTermMatch(matches);
  const quick = preferred?.publishedVersion;
  const label = quick ? `关联到 Reference：${preferred.title}` : matches.length > 1 ? '选择同名 Reference 词条' : preferred ? `关联到草稿词条：${preferred.title}` : '搜索并关联 Reference 词条';
  return <FormattingToolbar>
    {!!text.trim() && <Components.FormattingToolbar.Button className="bn-button quick-term-link" label={label} mainTooltip={label} secondaryTooltip={quick ? '仅为当前选中文字添加链接' : '确认目标后应用链接'} onClick={() => quick ? onAssociate(preferred, target) : onOpen()}>
      <BookOpenText size={16} /><span>{quick ? `关联 ${preferred.title}` : '关联词条'}</span>
    </Components.FormattingToolbar.Button>}
    {getFormattingToolbarItems()}
  </FormattingToolbar>;
}
