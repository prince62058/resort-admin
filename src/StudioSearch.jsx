import { useState } from 'react';
import { Search, ArrowUpRight, FileText } from 'lucide-react';

export default function StudioSearch({ navigation, content, navigate, close, Modal }) {
  const [query, setQuery] = useState('');
  const needle = query.toLowerCase().trim();
  const sections = navigation.filter(([, name]) => !needle || name.toLowerCase().includes(needle));
  const items = needle && content ? ['pages', 'rooms', 'experiences', 'galleries', 'posts'].flatMap(type => content[type].filter(item => (item.name + ' ' + item.slug).toLowerCase().includes(needle)).map(item => ({ type, item }))).slice(0, 8) : [];
  function open(tab, id) { close(); navigate(tab, id); }
  return <Modal title="Find your way around." close={close}><div className="studio-search"><label className="studio-search-input"><Search size={20} /><input autoFocus aria-label="Search the studio" placeholder="Search pages, stays, stories or settings…" value={query} onChange={e => setQuery(e.target.value)} /></label>{sections.length > 0 && <><span className="eyebrow">WORKSPACE</span><div className="studio-search-results">{sections.map(([key, title, Icon]) => <button key={key} onClick={() => open(key)}><Icon size={18} /><span>{title}</span><ArrowUpRight size={17} /></button>)}</div></>}{items.length > 0 && <><span className="eyebrow">YOUR CONTENT</span><div className="studio-search-results">{items.map(({ type, item }) => <button key={type + item.id} onClick={() => open(type, item.id)}><FileText size={18} /><span>{item.name}<small>{item.slug ? '/' + item.slug : 'Homepage'}</small></span><ArrowUpRight size={17} /></button>)}</div></>}{!sections.length && !items.length && <div className="empty"><Search size={30} /><h3>No matches just yet.</h3><p>Try a page name, a stay, or a workspace section.</p></div>}<p className="studio-search-hint">Use Tab to move through results, Enter to open, and Esc to close.</p></div></Modal>;
}
