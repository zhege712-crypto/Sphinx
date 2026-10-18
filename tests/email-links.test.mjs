import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emailAddress, emailHref } from '../shared/email-links.mjs';
import { safeLink, sanitizeDocument } from '../shared/document.mjs';

test('邮箱目标接受地址或 mailto，保留别名并编码邮件协议的特殊字符', () => {
  assert.equal(emailHref('  Writer+guide@Example.COM  '), 'mailto:Writer%2Bguide@example.com');
  assert.equal(emailAddress('MAILTO:Writer%2Bguide@example.com'), 'Writer+guide@example.com');
  assert.equal(emailHref('a?b#c@example.com'), 'mailto:a%3Fb%23c@example.com');
  assert.equal(emailHref(emailHref('a?b#c@example.com')), 'mailto:a%3Fb%23c@example.com');
  assert.equal(safeLink(emailHref('help@example.com')), 'mailto:help@example.com');
});

test('邮箱输入拒绝空地址、多收件人、换行和非邮箱目标', () => {
  for (const value of ['', 'name', 'a@', '@example.com', 'a@@example.com', '.a@example.com', 'a..b@example.com', 'a@-example.com', 'a@example..com', 'a@exam_ple.com', 'a@example.com,b@example.com', 'mailto:a@example.com?bcc=other@example.com', 'mailto:a@example.com%0d%0aBcc:b@example.com', 'a\nb@example.com', 'https://example.com', 'javascript:alert(1)', null]) {
    assert.throws(() => emailHref(value), /邮箱/);
  }
});

test('正文、列表和表格中的邮箱链接保留文字样式，网站卡片仍限网页', () => {
  const link = { type: 'link', href: emailHref('writer+guide@example.com'), content: [{ type: 'text', text: '联系贡献者', styles: { bold: true } }] };
  const clean = sanitizeDocument([{ type: 'paragraph', content: [link] }, { type: 'bulletListItem', content: [link] }, { type: 'table', content: { rows: [{ cells: [[link]] }] } }]);
  for (const content of [clean[0].content, clean[1].content, clean[2].content.rows[0].cells[0].content]) {
    assert.equal(content[0].href, 'mailto:writer%2Bguide@example.com');
    assert.equal(content[0].content[0].text, '联系贡献者');
    assert.equal(content[0].content[0].styles.bold, true);
  }
  assert.throws(() => sanitizeDocument([{ type: 'linkCard', props: { url: link.href } }]), /网站卡片只支持/);
});
