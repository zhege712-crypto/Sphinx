// BlockNote 0.56's light palette. Keep saved color names consistent with the editor.
export const RICH_TEXT_COLORS = {
  gray: { text: '#9b9a97', background: '#ebeced' },
  brown: { text: '#64473a', background: '#e9e5e3' },
  red: { text: '#e03e3e', background: '#fbe4e4' },
  orange: { text: '#d9730d', background: '#f6e9d9' },
  yellow: { text: '#dfab01', background: '#fbf3db' },
  green: { text: '#4d6461', background: '#ddedea' },
  blue: { text: '#0b6e99', background: '#ddebf1' },
  purple: { text: '#6940a5', background: '#eae4f2' },
  pink: { text: '#ad1a72', background: '#f4dfeb' },
};

export function richTextStyle(props = {}) {
  const style = {};
  const text = Object.hasOwn(RICH_TEXT_COLORS, props.textColor) ? RICH_TEXT_COLORS[props.textColor] : null;
  const background = Object.hasOwn(RICH_TEXT_COLORS, props.backgroundColor) ? RICH_TEXT_COLORS[props.backgroundColor] : null;
  if (text) style.color = text.text;
  if (background) style.backgroundColor = background.background;
  if (['left', 'center', 'right', 'justify'].includes(props.textAlignment)) style.textAlign = props.textAlignment;
  return style;
}
