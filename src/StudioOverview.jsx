import { ArrowUpRight, ArrowRight, BedDouble, FileText, Images, BookOpen, Check, Search, Globe, Upload, Inbox, Sparkles, Instagram, CalendarDays } from 'lucide-react';

const imageUrl = path => '/assets/' + path.split('/').map(encodeURIComponent).join('/');
const date = value => value ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)) : 'Not published yet';

export default function StudioOverview({ content, publishedAt, navigate }) {
  const stats = [
    ['Rooms & villas', content.rooms.length, BedDouble, 'rooms', 'Thoughtful places to stay'],
    ['Published pages', content.pages.filter(p => p.status === 'published').length, FileText, 'pages', 'Your resort, in every detail'],
    ['Photo collections', content.galleries.length, Images, 'galleries', 'A window into the nest'],
    ['Journal stories', content.posts.length, BookOpen, 'posts', 'Stories worth sharing']
  ];
  const entries = ['pages', 'rooms', 'experiences', 'galleries', 'posts'].flatMap(key => content[key]);
  const complete = entries.filter(item => item.seo.title && item.seo.description).length;
  const percentage = Math.round(complete / Math.max(entries.length, 1) * 100);
  const drafts = entries.filter(item => item.status === 'draft').length;
  const stories = [...content.posts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  return <>
    <div className="overview-grid">
      <section className="welcome-card">
        <img src="/assets/enhanced/story/story-belong-v1.webp" alt="An evening at Nature Nest" />
        <div className="welcome-card-top"><span className="welcome-location"><span /> THE NATURE NEST · MHOW</span><span className="welcome-monogram">N</span></div>
        <div className="welcome-card-copy"><span className="eyebrow">A LITTLE CARE GOES A LONG WAY</span><h2>Keep the feeling.<br /><em>Refresh the details.</em></h2><p>A new photograph. A thoughtful story.<br />Give your guests a reason to return.</p><button onClick={() => navigate('banners')}>Edit your banners <ArrowUpRight size={17} /></button></div>
        <span className="welcome-caption">YOUR WEBSITE. YOUR STORY.</span>
      </section>
      <section className="panel studio-health"><div className="health-title"><span className="icon-tile"><Sparkles size={20} /></span><span className="eyebrow">THE FINISHING TOUCHES</span></div><h2>Ready to be<br /><em>discovered.</em></h2><div className="health-progress-label"><span>Search details completed</span><strong>{complete}<small> / {entries.length}</small></strong></div><div className="health-progress" role="progressbar" aria-label="Content with SEO titles and descriptions" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}><span style={{ width: percentage + '%' }} /></div><p>{complete === entries.length ? 'Every content item has a search title and description.' : entries.length - complete + ' content items still need a title or description.'}</p><button className="health-row" onClick={() => navigate('pages')}><span><Search size={16} /> Review pages & SEO</span><ArrowUpRight size={16} /></button><button className="health-row" onClick={() => navigate('settings')}><span><Globe size={16} />{content.settings.siteUrl ? 'Website address added' : 'Add your website address'}</span>{content.settings.siteUrl ? <Check size={16} /> : <ArrowUpRight size={16} />}</button><div className="health-published"><CalendarDays size={14} /><span>Last published <strong>{date(publishedAt)}</strong></span></div></section>
    </div>
    <div className="dashboard-section-heading"><h2>Your resort at a glance</h2><span>THE DETAILS, ALL TOGETHER</span></div>
    <div className="stats">{stats.map(([label, value, Icon, to, note]) => <button key={label} onClick={() => navigate(to)}><div><span>{label}</span><span className={'stat-icon stat-icon-' + to}><Icon size={20} /></span></div><strong>{String(value).padStart(2, '0')}</strong><small>{note}<ArrowUpRight size={15} /></small></button>)}</div>
    <div className="dashboard-section-heading"><h2>Make a little room for something new.</h2><span>YOUR NEXT CHAPTER</span></div>
    <div className="quick-actions">
      {[[Upload, 'A fresh perspective', 'Add photographs to your library', 'media'], [Inbox, 'A warm welcome', 'Follow up with guest enquiries', 'enquiries'], [Instagram, 'Moments in motion', 'Curate your corner reels', 'reels']].map(([Icon, title, note, key]) => <button key={key} onClick={() => navigate(key)}><span className="quick-action-icon"><Icon size={20} /></span><span><strong>{title}</strong><small>{note}</small></span><ArrowUpRight size={18} /></button>)}
    </div>
    <div className="dashboard-lower">
      <section className="panel studio-journal"><div className="dashboard-panel-heading"><div><span className="eyebrow">FROM YOUR JOURNAL</span><h2>A story starts here.</h2></div><button className="text-button" onClick={() => navigate('posts')}>All stories <ArrowRight size={16} /></button></div>{stories.length ? stories.map(story => <button className="journal-row" key={story.id} onClick={() => navigate('posts', story.id)}><img src={imageUrl(story.images[0])} alt="" loading="lazy" /><span><small>{story.category || 'From the nest'} · {date(story.date)}</small><strong>{story.name}</strong></span><span className={'pill ' + story.status}>{story.status}</span><ArrowUpRight size={17} /></button>) : <div className="empty"><BookOpen size={30} /><h3>Your next story is waiting.</h3><button className="secondary" onClick={() => navigate('posts')}>Open the journal</button></div>}</section>
      <section className="studio-note"><span className="note-icon"><BookOpen size={23} /></span><span className="eyebrow">A THOUGHT FOR YOUR STUDIO</span><h2>Small details.<br /><em>Lasting impressions.</em></h2><p>Keep your photographs current, your words welcoming, and your guest information easy to find.</p><div className="note-bottom"><span>{drafts ? `${drafts} draft ${drafts === 1 ? 'item' : 'items'} in your workspace` : 'A little care, every day.'}</span><button aria-label="Review your website copy" onClick={() => navigate('copy')}><ArrowUpRight size={21} /></button></div></section>
    </div>
  </>;
}
