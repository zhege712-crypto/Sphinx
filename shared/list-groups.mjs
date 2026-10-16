// Keep adjacent BlockNote list blocks in one semantic list. An explicit restart
// begins a new numbered list; nested children are grouped independently.
export function groupLists(blocks = []) {
  const groups = [];
  for (const block of blocks) {
    if (!['bulletListItem', 'numberedListItem'].includes(block.type)) { groups.push({ kind: 'block', block }); continue; }
    const previous = groups.at(-1);
    const start = Number.isSafeInteger(block.props?.start) && block.props.start > 0 ? block.props.start : undefined;
    const continues = previous?.kind === 'list' && previous.type === block.type && (block.type !== 'numberedListItem' || start === undefined || start === previous.start + previous.blocks.length);
    if (continues) previous.blocks.push(block);
    else groups.push({ kind: 'list', type: block.type, start: start || 1, blocks: [block] });
  }
  return groups;
}
