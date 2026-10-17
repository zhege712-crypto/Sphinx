import { ArrowUpRight } from 'lucide-react';
import { safeLink } from '../shared/document.mjs';
import { BrandMark, brandForUrl } from './Brands';
export function websiteUrl(value) { try { const url = safeLink(value); return /^https?:\/\//.test(url) ? url : ''; } catch { return ''; } }
export function WebsiteCard({ title, url }) {
  const href = websiteUrl(url);
  if (!href) return null;
  return <a className="reference-card website-card" href={href} target="_blank" rel="noopener noreferrer"><BrandMark brand={brandForUrl(href)} /><span><strong>{title || new URL(href).hostname}</strong><small>{href}</small></span><ArrowUpRight size={18} /></a>;
}
