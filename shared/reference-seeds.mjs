// Initial content migrated from the previously public fixed directory. Never overwrite edits.
const seeds = [
  ['Anthropic 模型', 'https://platform.claude.com/docs/en/models/overview'],
  ['ChatGPT', 'https://chatgpt.com/'],
  ['Claude', 'https://claude.ai/'],
  ['Claude Haiku', 'https://platform.claude.com/docs/en/models/haiku-5-5/overview'],
  ['Claude Opus', 'https://platform.claude.com/docs/en/models/opus-5-5/overview'],
  ['Claude Sonnet', 'https://platform.claude.com/docs/en/models/sonnet-5-5/overview'],
  ['Codex', 'https://developers.openai.com/codex/'],
  ['DeepSeek', 'https://www.deepseek.com/'],
  ['GPT', 'https://developers.openai.com/api/docs/models'],
  ['GPT-6 Astra', 'https://developers.openai.com/api/docs/models/gpt-6-astra'],
  ['GPT-6 Luna', 'https://developers.openai.com/api/docs/models/gpt-6-luna'],
  ['GPT-6.1 Sol', 'https://developers.openai.com/api/docs/models/gpt-6.1-sol'],
];
export const referenceSeeds = seeds.map(([title, url], index) => ({
  id: `c71e0000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  title, blocks: [{ type: 'paragraph', content: [] }, { type: 'linkCard', props: { title, url } }],
}));
