import { sanitizeDocument } from '../shared/document.mjs';

// This is a one-time editable draft, never a public view of the access-control list.
export function contributorsDraft(members) {
  const logins = [...new Set(members.map(member => member.login).filter(Boolean))];
  return sanitizeDocument([
    { type: 'heading', props: { level: 3 }, content: '写作成员' },
    ...logins.map(login => ({ type: 'bulletListItem', content: /^[a-z\d][a-z\d-]{0,38}$/i.test(login)
      ? [{ type: 'link', href: `https://github.com/${login}`, content: [{ type: 'text', text: login, styles: {} }] }]
      : [{ type: 'text', text: login, styles: {} }] })),
    { type: 'heading', props: { level: 3 }, content: '其他贡献者' },
    { type: 'paragraph', content: [] },
  ]);
}
