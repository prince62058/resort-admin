import { useState } from 'react';
import { Search, ArrowUpRight, FileText, Check, LayoutGrid, Image as ImageIcon } from 'lucide-react';
import { itemPath } from '../shared/content.js';
const imageUrl = path => '/assets/' + path.split('/').map(encodeURIComponent).join('/');

export default function ContentCollection({ type, title, content, open }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const entries = content[type];
  const items = entries.filter(item => (filter === 'all' || item.status === filter) && (item.name + ' ' + item.slug).toLowerCase().includes(query.toLowerCase())).sort((a, b) => a.order - b.order);
  return <>
    <div className="collection-toolbar"><div className="collection-filters" aria-label="Content visibility">{[['all', 'All'], ['published', 'Published'], ['draft', 'Drafts']].map(([key, label]) => <button key={key} aria-pressed={filter === key} className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>{label}<span>{entries.filter(item => key === 'all' || item.status === key).length}</span></button>)}</div><label className="search"><Search size={17} /><input aria-label="Search content" placeholder={'Search ' + title.toLowerCase() + '…'} value={query} onChange={e => setQuery(e.target.value)} /></label></div>
    <div className="collection-count"><span><LayoutGrid size={14} />{items.length} {items.length === 1 ? 'item' : 'items'}</span><span>SELECT AN ITEM TO EDIT</span></div>
    <div className="content-grid">{items.map(item => <button key={item.id} className={'content-card ' + (type === 'pages' ? 'page-card' : '')} onClick={() => open(item.id)}>{type !== 'pages' && <div className="card-image"><img src={imageUrl(item.images[0])} alt="" loading="lazy" /><span className={'pill ' + item.status}>{item.status}</span><span className="card-image-count"><ImageIcon size={12} /> {item.images.length}</span></div>}<div className="card-copy">{type === 'pages' && <div className="page-card-top"><span className="page-card-icon"><FileText size={23} /></span><span className={'pill ' + item.status}>{item.status}</span></div>}<span className="card-kicker">{type === 'pages' ? item.template + ' page' : type === 'rooms' ? item.type : type === 'posts' ? item.category || 'From the nest' : type === 'galleries' ? 'Photo collection' : item.tag || 'An experience'}</span><h3>{item.name}</h3><p className="slug-line">{itemPath(content, type, item)}</p>{type === 'rooms' && <div className="card-rate">₹{item.price.toLocaleString('en-IN')} <span>/ night, starting from</span></div>}<div className="card-footer"><span>{item.seo.title && item.seo.description ? <><Check size={13} />SEO details added</> : <><Search size={13} />Add SEO details</>}</span><span className="card-open"><ArrowUpRight size={17} /></span></div></div></button>)}</div>
    {!items.length && <div className="panel empty"><Search size={32} /><h2>No content found.</h2><p>Try another search or change the visibility filter.</p><button className="secondary" onClick={() => { setQuery(''); setFilter('all'); }}>Show all content</button></div>}
  </>;
}
