import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowUpRight, ArrowLeft, ArrowRight, LayoutDashboard, FileText, BedDouble, Sparkles, Images, BookOpen, PanelTop, Type, Settings, Inbox, Search, Plus, X, Check, LogOut, Upload, ChevronLeft, ChevronRight, Trash2, Globe, History, ShieldCheck, Menu, Leaf, Instagram, Image as ImageIcon, Save, ExternalLink, Copy } from 'lucide-react';
import { api } from './api.js';
import ReelsEditor from './ReelsEditor.jsx';
import StudioOverview from './StudioOverview.jsx';
import StudioSearch from './StudioSearch.jsx';
import ContentCollection from './ContentCollection.jsx';
import { emptyReels } from '../shared/reels.js';
import { slugify, itemPath } from '../shared/content.js';
import seed from '../shared/seed.json';
import './styles.css';
const websiteUrl = window.__NEST_CONFIG__?.siteUrl || 'http://localhost:5173';
const websiteLink = path => new URL(path, websiteUrl).href;
const navigation = [['overview', 'Overview', LayoutDashboard], ['pages', 'Pages & SEO', FileText], ['rooms', 'Stays', BedDouble], ['experiences', 'Experiences', Sparkles], ['galleries', 'Galleries', Images], ['posts', 'Journal', BookOpen], ['banners', 'Banners & sections', PanelTop], ['reels', 'Corner reels', Instagram], ['copy', 'Website copy', Type], ['media', 'Media library', ImageIcon], ['enquiries', 'Guest enquiries', Inbox], ['settings', 'Site settings', Settings], ['history', 'Version history', History], ['account', 'Account', ShieldCheck]];
const navigationGroups = [['Workspace', ['overview', 'enquiries']], ['Your content', ['pages', 'rooms', 'experiences', 'galleries', 'posts']], ['The visual story', ['banners', 'reels', 'media', 'copy']], ['Manage', ['settings', 'history', 'account']]];
const collectionNames = {
  pages: 'Pages',
  rooms: 'Stays',
  experiences: 'Experiences',
  galleries: 'Galleries',
  posts: 'Journal stories'
};
const imageUrl = path => '/assets/' + path.split('/').map(encodeURIComponent).join('/');
const human = value => value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase());
const clone = value => structuredClone(value);
function Field({
  label,
  value,
  onChange,
  type = 'text',
  hint,
  rows = 4,
  required = false,
  ...props
}) {
  return <label className={'field ' + (type === 'textarea' ? 'wide' : '')}><span>{label}{required && <b> *</b>}</span>{type === 'textarea' ? <textarea rows={rows} value={value ?? ''} onChange={e => onChange(e.target.value)} {...props} /> : <input type={type} value={value ?? ''} onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)} required={required} {...props} />} {hint && <small>{hint}</small>}</label>;
}
function Select({
  label,
  value,
  onChange,
  values
}) {
  return <label className="field"><span>{label}</span><select value={value} onChange={e => onChange(e.target.value)}>{values.map(v => <option key={Array.isArray(v) ? v[0] : v} value={Array.isArray(v) ? v[0] : v}>{Array.isArray(v) ? v[1] : v}</option>)}</select></label>;
}
function Toggle({
  label,
  value,
  onChange
}) {
  return <label className="toggle"><input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} /><span>{label}</span></label>;
}
function App() {
  const [auth, setAuth] = useState(undefined),
    [setup, setSetup] = useState(false),
    [fatal, setFatal] = useState('');
  const [doc, setDoc] = useState(null),
    [content, setContent] = useState(null),
    [tab, setTab] = useState('overview'),
    [selected, setSelected] = useState(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState(''),
    [mobile, setMobile] = useState(false),
    [searchOpen, setSearchOpen] = useState(false);
  const sidebarRef = useRef();
  const dirty = Boolean(doc && JSON.stringify(content) !== JSON.stringify(doc.content));
  useEffect(() => {
    api('/status').then(s => {
      setSetup(s.setupRequired);
      return api('/session');
    }).then(setAuth).catch(e => {
      if (e.status === 401) setAuth(null);else setFatal(e.message);
    });
  }, []);
  async function reload() {
    const d = await api('/content');
    setDoc(d);
    setContent(clone(d.content));
  }
  useEffect(() => {
    if (auth) reload().catch(e => setError(e.message));
  }, [auth?.user?.email]);
  useEffect(() => {
    const protect = e => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', protect);
    return () => window.removeEventListener('beforeunload', protect);
  }, [dirty]);
  useEffect(() => {
    if (!auth) return;
    const shortcut = e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setMobile(false);
        setSearchOpen(open => !open);
      }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, [auth]);
  useEffect(() => {
    if (!mobile) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sidebarRef.current?.querySelector('.sidebar-close')?.focus();
    const keyboard = e => {
      if (e.key === 'Escape') setMobile(false);
      if (e.key !== 'Tab') return;
      const focusable = [...sidebarRef.current.querySelectorAll('a[href], button')].filter(el => el.getClientRects().length);
      const first = focusable[0], last = focusable.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    const resize = () => { if (window.innerWidth > 900) setMobile(false); };
    window.addEventListener('keydown', keyboard);
    window.addEventListener('resize', resize);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', keyboard);
      window.removeEventListener('resize', resize);
      previousFocus?.focus();
    };
  }, [mobile]);
  function update(mutator) {
    setContent(prev => {
      const next = clone(prev);
      mutator(next);
      return next;
    });
    setMessage('');
    setError('');
  }
  function navigate(next, id = null) {
    setTab(next);
    setSelected(id);
    setMobile(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  async function save(publish) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const d = await api('/content', {
        method: 'PUT',
        body: {
          content,
          version: doc.version,
          publish
        }
      });
      setDoc(d);
      setContent(clone(d.content));
      setMessage(publish ? 'Published. Your website now uses this content.' : 'Draft saved. Your live website is unchanged.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    if (dirty && !confirm('You have unsaved edits. Sign out and discard them?')) return;
    try {
      await api('/logout', {
        method: 'POST'
      });
      setAuth(null);
      setDoc(null);
      setContent(null);
    } catch (e) {
      setError(e.message);
    }
  }
  if (fatal) return <div className="auth-page"><div className="auth-card"><h1>Studio is unavailable.</h1><p>{fatal}</p><p>Check that the backend is available and try again.</p><button onClick={() => location.reload()}>Try again</button></div></div>;
  if (auth === undefined) return <div className="loading"><Leaf /><p>Opening your studio…</p></div>;
  if (!auth) return <Login setup={setup} onLogin={a => {
    setAuth(a);
    setSetup(false);
  }} />;
  const title = navigation.find(n => n[0] === tab)?.[1];
  const changeItem = (key, value) => update(c => {
    if (tab === 'posts' && key === 'featured' && value) c.posts.forEach(p => { p.featured = false; });
    c[tab].find(x => x.id === selected)[key] = value;
  });
  const item = collectionNames[tab] && content?.[tab].find(x => x.id === selected);
  return <div className="studio">
  {mobile && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMobile(false)} />}
  <aside ref={sidebarRef} className={'sidebar ' + (mobile ? 'open' : '')} aria-label="Studio sidebar"><div className="sidebar-brand-row"><a className="studio-brand" href={websiteUrl} target="_blank" rel="noreferrer"><img src="/assets/3d/nature-nest-emblem.webp" alt="" /><span>Nature Nest<small>THE CONTENT STUDIO</small></span></a><button className="icon sidebar-close" aria-label="Close menu" onClick={() => setMobile(false)}><X size={20} /></button></div><div className="workspace-badge"><span className="workspace-badge-icon"><Leaf size={16} /></span><span>Your resort workspace<small>A little closer to nature.</small></span><span className="workspace-badge-dot" /></div><nav aria-label="Studio sections">{navigationGroups.map(([group, keys]) => <div className="nav-group" key={group}><div className="sidebar-caption">{group}</div>{keys.map(key => { const [, label, Icon] = navigation.find(item => item[0] === key); return <button key={key} className={tab === key ? 'active' : ''} aria-current={tab === key ? 'page' : undefined} onClick={() => navigate(key)}><Icon size={18} strokeWidth={1.6} /><span>{label}</span>{tab === key && <span className="nav-dot" />}</button>; })}</div>)}</nav><div className="sidebar-bottom"><a className="sidebar-visit" href={websiteUrl} target="_blank" rel="noreferrer"><Globe size={17} /><span>Visit website</span><ArrowUpRight size={17} /></a><div className="profile"><button className="profile-account" aria-label="Manage your account" onClick={() => navigate('account')}><span className="avatar">{auth.user.email[0].toUpperCase()}</span><span>Resort administrator<small>{auth.user.email}</small></span></button><button className="icon" title="Sign out" aria-label="Sign out" onClick={logout}><LogOut size={16} /></button></div></div></aside>
  <div className="workspace" inert={mobile ? true : undefined}><header className="topbar"><div className="breadcrumbs"><button className="mobile-toggle icon" aria-label="Open navigation" aria-expanded={mobile} onClick={() => setMobile(true)}><Menu /></button><span>Workspace</span><ChevronRight size={14} /><strong>{title}</strong></div><div className="topbar-actions"><button className="studio-search-trigger" aria-label="Open studio search" onClick={() => setSearchOpen(true)}><Search size={16} /><span>Search anything…</span><kbd>⌘ K</kbd></button><span className={'save-state ' + (dirty ? 'unsaved' : '')}><i />{dirty ? 'Unsaved changes' : 'All changes saved'}</span><a href={websiteUrl} target="_blank" rel="noreferrer" className="preview-link">View website <ExternalLink size={15} /></a></div></header>
   {!content ? <div className="loading">Loading content… {error && <p role="alert">{error}<button onClick={() => reload().catch(e => setError(e.message))}>Retry</button></p>}</div> : <>
    <main className="workspace-body" id="studio-content"><div className="page-heading"><div><span className="eyebrow">THE NATURE NEST / STUDIO</span><h1>{tab === 'overview' ? 'A little care. A better stay.' : title}</h1><p>{tab === 'overview' ? 'Everything that makes your website feel like your resort, in one place.' : tab === 'media' ? 'Your resort, beautifully organised. Upload, browse and choose your photographs.' : tab === 'enquiries' ? 'Keep every conversation close. Follow up and manage your guest requests.' : 'Shape your story, keep it current, and make every detail yours.'}</p></div>{collectionNames[tab] && !selected && <button className="primary" onClick={() => {
              const sample = clone(seed[tab][0]);
              sample.id = crypto.randomUUID();
              sample.slug = 'new-' + slugify(tab) + '-' + Date.now().toString().slice(-5);
              sample.name = 'Untitled ' + (tab === 'posts' ? 'story' : tab === 'rooms' ? 'stay' : 'page');
              sample.status = 'draft';
              sample.order = content[tab].length;
              sample.seo = {
                ...sample.seo,
                title: '',
                description: '',
                keywords: []
              };
              if (tab === 'pages') {
                sample.template = 'custom';
                sample.nav = false;
                sample.body = '';
                sample.footerLabel = sample.name;
              }
              if (tab === 'posts') {
                sample.body = '';
                sample.summary = '';
                sample.category = 'From the nest';
                sample.featured = false;
                sample.date = new Date().toLocaleDateString('en-CA');
              }
              if (tab === 'rooms') sample.featured = false;
              update(c => c[tab].push(sample));
              setSelected(sample.id);
            }}><Plus size={17} /> Add {({pages:'page',rooms:'stay',experiences:'experience',galleries:'gallery',posts:'story'})[tab]}</button>}</div>
    {error && <div className="notice error" role="alert">{error}<button className="icon" aria-label="Dismiss error" onClick={() => setError('')}><X size={16} /></button></div>}{message && <div className="notice success" role="status"><Check size={17} />{message}</div>}
    {tab === 'overview' && <StudioOverview content={content} publishedAt={doc.publishedAt} navigate={navigate} />}
    {collectionNames[tab] && (item ? <><button className="back-link" onClick={() => setSelected(null)}><ArrowLeft size={17} /> All {collectionNames[tab].toLowerCase()}</button><ContentEditor type={tab} item={item} content={content} change={changeItem} remove={() => {
              if (confirm('Remove this item from the draft? The live version changes only when you publish.')) {
                update(c => {
                  c[tab] = c[tab].filter(i => i.id !== item.id);
                });
                setSelected(null);
              }
            }} /></> : <ContentCollection key={tab} type={tab} title={collectionNames[tab]} content={content} open={setSelected} />)}
    {tab === 'reels' && <ReelsEditor config={content.reels || emptyReels} change={value => update(c => { c.reels = value; })} ImageList={ImageList} />}
    {tab === 'media' && <MediaLibrary />}
    {tab === 'enquiries' && <Enquiries />}
    {tab === 'settings' && <SettingsEditor settings={content.settings} change={(key, value) => update(c => {
            c.settings[key] = value;
          })} />}
    {tab === 'copy' && <CopyEditor content={content} update={update} />}
    {tab === 'banners' && <Banners content={content} update={update} />}
    {tab === 'history' && <Versions restore={value => {
            if (confirm('Load this previous version into your draft? Publish separately when ready.')) {
              setContent(value);
              setMessage('Previous version loaded into the editor. Save or publish when ready.');
            }
          }} />}
    {tab === 'account' && <Account email={auth.user.email} />}
    </main><div className={"publish-bar " + (dirty ? "has-changes" : "")}><div><span className="publish-dot" /><span><strong>{dirty ? 'You have unsaved changes.' : 'Your draft is saved.'}</strong><small>Save your draft. Publish when it feels just right.</small></span></div><div><button className="secondary" disabled={busy} onClick={() => save(false)}><Save size={16} />{busy ? 'Saving…' : 'Save draft'}</button><button className="primary" disabled={busy} onClick={() => save(true)}><Globe size={16} /> Publish changes</button></div></div>
   </>}
  </div>
  {searchOpen && <StudioSearch navigation={navigation} content={content} navigate={navigate} close={() => setSearchOpen(false)} Modal={Modal} />}
 </div>;
}
function Login({
  setup,
  onLogin
}) {
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [token, setToken] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return <div className="auth-page"><div className="auth-art"><img src="/assets/enhanced/story/story-belong-v1.webp" alt="Nature Nest gardens" /><div><span>THE NATURE NEST</span><h1>A thoughtful space.<br /><em>Behind every stay.</em></h1><p>Your stories. Your photographs. Your little corner of nature.</p></div></div><div className="auth-card"><img className="auth-logo" src="/assets/3d/nature-nest-emblem.webp" alt="Nature Nest" /><span className="eyebrow">WELCOME TO YOUR STUDIO</span><h1>{setup ? 'Make it yours.' : 'Welcome back.'}</h1><p>{setup ? 'Create the resort owner account using your private server setup token.' : 'Sign in to care for your website.'}</p><form onSubmit={async e => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
          onLogin(await api(setup ? '/setup' : '/login', {
            method: 'POST',
            body: {
              email,
              password,
              setupToken: token
            }
          }));
        } catch (e) {
          setError(e.message);
        } finally {
          setBusy(false);
        }
      }}><Field label="Email address" type="email" value={email} onChange={setEmail} required autoComplete="username" /><Field label="Password" type="password" value={password} onChange={setPassword} required minLength={12} maxLength={128} autoComplete={setup ? 'new-password' : 'current-password'} hint={setup ? 'Choose a unique password with at least 12 characters.' : undefined} />{setup && <Field label="Private setup token" type="password" value={token} onChange={setToken} required autoComplete="off" hint="Use ADMIN_SETUP_TOKEN from the server environment. This is only needed for the first account." />}{error && <p className="notice error" role="alert">{error}</p>}<button className="primary" disabled={busy}>{busy ? 'Please wait…' : setup ? 'Create owner account' : 'Sign in'}<ArrowRight size={18} /></button></form><a className="back-link" href={websiteUrl}><ArrowLeft size={15} /> Back to the resort</a><small className="auth-security"><ShieldCheck size={14} /> Private access · Secure session</small></div></div>;
}
function ImageList({
  label = 'Photographs',
  images,
  onChange,
  single = false
}) {
  const [picker, setPicker] = useState(false);
  return <div className="image-editor"><div className="field-heading"><strong>{label}</strong><button className="text-button" onClick={() => setPicker(true)}><Plus size={15} />{single ? 'Choose image' : 'Add images'}</button></div><div className="image-strip">{images.map((image, index) => <div key={image + '-' + index}><img src={imageUrl(image)} alt={'Selected photo ' + (index + 1)} /><div><button className="icon" disabled={index === 0} aria-label={'Move photo ' + (index + 1) + ' earlier'} onClick={() => {
            const a = [...images];
            [a[index - 1], a[index]] = [a[index], a[index - 1]];
            onChange(a);
          }}><ChevronLeft size={14} /></button><span>{index + 1}</span><button className="icon" disabled={index === images.length - 1} aria-label={'Move photo ' + (index + 1) + ' later'} onClick={() => {
            const a = [...images];
            [a[index], a[index + 1]] = [a[index + 1], a[index]];
            onChange(a);
          }}><ChevronRight size={14} /></button><button className="icon danger" disabled={images.length === 1} aria-label={'Remove photo ' + (index + 1)} onClick={() => onChange(images.filter((_, i) => i !== index))}><X size={14} /></button></div></div>)}</div><small className="muted">{single ? 'Choose one image.' : 'First photo is the cover. Use the arrows to arrange slideshow order.'}</small>{picker && <Modal title="Choose from your library" close={() => setPicker(false)}><MediaLibrary choose={path => {
        onChange(single ? [path] : [...new Set([...images, path])]);
        setPicker(false);
      }} /></Modal>}</div>;
}
function Modal({
  title,
  close,
  children
}) {
  const ref = useRef();
  useEffect(() => {
    const focus = document.activeElement;
    ref.current.showModal();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
      focus?.focus();
    };
  }, []);
  return <dialog className="studio-modal" aria-label={title} ref={ref} onCancel={close}><header><h2>{title}</h2><button className="icon" aria-label="Close dialog" onClick={close}><X /></button></header>{children}</dialog>;
}
function SeoEditor({
  seo,
  onChange,
  path,
  siteUrl
}) {
  const keywords = seo.keywords.join(', ');
  return <section className="panel seo-editor"><div className="panel-heading"><Search size={20} /><div><h2>Search engine appearance</h2><p>Give this page a clear, useful introduction.</p></div></div><div className="search-preview"><span>{siteUrl || 'https://your-resort.com'}{path}</span><h3>{seo.title || 'Your page title appears here'}</h3><p>{seo.description || 'Write a short description that helps guests understand what they will find on this page.'}</p></div><div className="form-grid"><Field label="SEO title" value={seo.title} onChange={v => onChange({
        ...seo,
        title: v
      })} maxLength={120} hint={seo.title.length + ' characters · Aim for a clear title around 30–60 characters.'} /><Field label="Focus keywords" value={keywords} onChange={v => onChange({
        ...seo,
        keywords: v.split(',').map(k => k.trimStart())
      })} hint="Comma-separated planning keywords. Use them naturally in your title, slug and content." /><Field label="Meta description" type="textarea" rows={3} value={seo.description} maxLength={350} onChange={v => onChange({
        ...seo,
        description: v
      })} hint={seo.description.length + ' characters · A concise, relevant description is better than keyword repetition.'} /></div><ImageList label="Social sharing image" images={[seo.image]} single onChange={v => onChange({
      ...seo,
      image: v[0]
    })} /><Toggle label="Hide this page from search engines (noindex)" value={seo.noindex} onChange={v => onChange({
      ...seo,
      noindex: v
    })} /><small className="muted">Focus keywords are an editorial guide. Google does not use the meta keywords tag as a ranking signal.</small></section>;
}
function ContentEditor({
  type,
  item,
  content,
  change,
  remove
}) {
  const builtIn = type === 'pages' && ['home', 'rooms', 'services', 'galleries', 'about', 'contact', 'blog'].includes(item.template);
  return <div className="editor-layout"><div><section className="panel"><div className="panel-heading"><FileText size={21} /><h2>{item.name}</h2></div><div className="form-grid"><Field label="Name / title" value={item.name} onChange={v => change('name', v)} maxLength={180} required /><Select label="Visibility" value={item.status} values={builtIn ? [['published', 'Published']] : [['draft', 'Draft'], ['published', 'Published']]} onChange={v => change('status', v)} /><div className="field"><span>URL slug</span><div className="slug-input"><input aria-label="URL slug" disabled={item.template === 'home'} value={item.slug} onChange={e => change('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 100))} /><button className="icon" title="Generate slug from name" disabled={item.template === 'home'} onClick={() => change('slug', slugify(item.name))}><Sparkles size={17} /></button></div><small>Lowercase words separated by hyphens. Old published URLs redirect automatically.</small></div><Field label="Display order" type="number" value={item.order} onChange={v => change('order', v)} min={0} />{type === 'rooms' && <><Select label="Stay category" value={item.type} values={['Cottages', 'Private villas']} onChange={v => change('type', v)} /><Field label="Starting price (INR / night)" type="number" value={item.price} min={0} onChange={v => change('price', v)} /><Field label="Short description" type="textarea" value={item.summary} onChange={v => change('summary', v)} /><Field label="Full description" type="textarea" rows={8} value={item.description} onChange={v => change('description', v)} /><Field label="Amenities (one per line)" type="textarea" value={item.amenities.join('\n')} onChange={v => change('amenities', v.split('\n'))} /><Toggle label="Feature this stay on the homepage" value={item.featured} onChange={v => change('featured', v)} /></>}{type === 'pages' && <>{!builtIn && <Select label="Page layout" value={item.template} values={[["custom", "Standard page"], ["legal", "Policy document"], ["support", "Guest guide with FAQs"]]} onChange={v => change("template", v)} />}<Select label="Footer section" value={item.footerGroup || "main"} values={[["main", "Our links"], ["help", "Here to help"], ["hidden", "Hide from footer"]]} onChange={v => change("footerGroup", v)} /><Field label="Footer link label" value={item.footerLabel} onChange={v => change('footerLabel', v)} /><Field label="Hero heading" value={item.heading} onChange={v => change('heading', v)} hint="Leave blank to use the section’s existing headline." /><Field label="Hero accent" value={item.accent} onChange={v => change('accent', v)} /><Field label="Hero subtitle" type="textarea" value={item.subtitle} onChange={v => change('subtitle', v)} /><Toggle label="Show in main navigation" value={item.nav} onChange={v => change('nav', v)} />{['legal', 'support'].includes(item.template) && <Field label="Last updated date" type="date" value={item.updated || ''} onChange={v => change('updated', v)} />}{['custom', 'legal', 'support'].includes(item.template) && <Field label="Page content" type="textarea" rows={14} value={item.body} onChange={v => change('body', v)} hint={item.template === 'custom' ? 'Separate paragraphs with a blank line.' : 'Use ## for headings and - for lists. Use {{resortName}}, {{email}}, {{phone}} and {{address}} to keep contact details in sync. Text only; HTML is not supported.'} />}<p className="muted wide">Homepage and stays hero designs are managed in Banners & sections. Other built-in section text is in Website copy.</p></>}{type === 'experiences' && <><Field label="Category label" value={item.tag} onChange={v => change('tag', v)} /><Field label="Description" type="textarea" value={item.text} onChange={v => change('text', v)} /></>}{type === 'galleries' && <Field label="Gallery description" type="textarea" value={item.description} onChange={v => change('description', v)} />}{type === 'posts' && <><Field label="Story category" value={item.category || ''} maxLength={80} onChange={v => change('category', v)} hint="Categories become filters on the blog page." /><Toggle label="Feature this story" value={Boolean(item.featured)} onChange={v => change('featured', v)} /><Field label="Publication date" type="date" value={item.date} onChange={v => change('date', v)} /><Field label="Excerpt" type="textarea" value={item.summary} onChange={v => change('summary', v)} /><Field label="Story content" type="textarea" rows={18} value={item.body} onChange={v => change('body', v)} hint="Separate paragraphs with a blank line. Use ## for headings and - for lists. Headings automatically appear in the article contents. The first image is the card cover; all selected images appear in the article slideshow." /></>}</div><ImageList images={item.images} onChange={v => change('images', v)} />{type === 'rooms' && <ImageList label="Homepage slideshow" images={item.homeImages} onChange={v => change('homeImages', v)} />}</section><SeoEditor seo={item.seo} onChange={v => change('seo', v)} path={itemPath(content, type, item)} siteUrl={content.settings.siteUrl} /></div><aside className="editor-aside panel"><span className="eyebrow">PUBLISHING NOTES</span><h3>A thoughtful final look.</h3><p>Check the words, choose a strong cover photo, and give the page a clear URL.</p><ul><li>Draft items stay off the website.</li><li>Saving keeps your work in the studio.</li><li>Publishing updates all saved fields in this editor.</li></ul><a className="secondary" href={websiteLink(itemPath(content, type, item))} target="_blank" rel="noreferrer">View live page <ExternalLink size={15} /></a>{!builtIn && <button className="text-button danger" onClick={remove}><Trash2 size={15} /> Remove from draft</button>}</aside></div>;
}
function MediaLibrary({
  choose
}) {
  const [folders, setFolders] = useState([]),
    [folder, setFolder] = useState(''),
    [page, setPage] = useState(1),
    [items, setItems] = useState([]),
    [total, setTotal] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [uploadFolder, setUploadFolder] = useState('resort'),
    [notice, setNotice] = useState('');
  const input = useRef();
  async function load() {
    setBusy(true);
    try {
      const response = await fetch('/api/media?limit=24&page=' + page + (folder ? '&folder=' + encodeURIComponent(folder) : ''), {
        cache: 'no-store'
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setItems(data.items);
      setTotal(data.total);
      const f = await fetch('/api/media/folders', {
        cache: 'no-store'
      }).then(r => r.json());
      setFolders(f.folders || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    load();
  }, [page, folder]);
  async function upload(files) {
    setBusy(true);
    setError('');
    try {
      for (const file of files) {
        if (file.size > 12 * 1024 * 1024) throw new Error('Images must be under 12 MB.');
        await api('/media?folder=' + encodeURIComponent(uploadFolder) + '&name=' + encodeURIComponent(file.name), {
          method: 'POST',
          body: file,
          binary: true,
          headers: {
            'Content-Type': file.type
          }
        });
      }
      setNotice(files.length + ' image(s) uploaded.');
      setFolder('uploads/' + uploadFolder);
      setPage(1);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      input.current.value = '';
    }
  }
  return <div className="media-library"><div className="media-upload"><div><Upload size={23} /><div><strong>A new view of the nest.</strong><p>JPG, PNG, WebP or AVIF · up to 12 MB each · optimised on upload</p></div></div><div><input aria-label="Upload folder" value={uploadFolder} placeholder="Folder name" onChange={e => setUploadFolder(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 70))} /><input hidden ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={e => upload([...e.target.files])} /><button className="primary" disabled={busy || !uploadFolder} onClick={() => input.current.click()}><Upload size={16} /> Upload images</button></div></div>{error && <p className="notice error" role="alert">{error}</p>}{notice && <p className="notice success" role="status">{notice}</p>}<div className="collection-toolbar"><Select label="Folder" value={folder} onChange={f => {
        setFolder(f);
        setPage(1);
      }} values={[["", "All folders"], ...folders.map(f => [f.folder, f.folder || 'Original assets'])]} /><span>{total} images {busy ? '· Loading…' : ''}</span></div><div className="media-grid">{items.map(item => <div className="media-card" key={item.path}><button onClick={() => {
          if (choose) choose(item.path);else {
            navigator.clipboard.writeText(item.url).then(() => setNotice('Image URL copied.')).catch(() => setNotice(item.url));
          }
        }} aria-label={(choose ? 'Select ' : 'Copy URL for ') + item.name}><img src={item.url} loading="lazy" alt={item.name} /><span>{choose ? <Plus size={18} /> : <Copy size={18} />}</span></button><div><strong title={item.name}>{item.name}</strong><small>{Math.round(item.bytes / 1024)} KB · {item.contentType.split('/')[1].toUpperCase()}</small>{!choose && item.path.startsWith('uploads/') && <button className="icon danger" aria-label={'Delete ' + item.name} onClick={async () => {
            if (!confirm('Permanently remove this unused upload?')) return;
            try {
              await api('/media', {
                method: 'DELETE',
                body: {
                  path: item.path
                }
              });
              await load();
            } catch (e) {
              setError(e.message);
            }
          }}><Trash2 size={15} /></button>}</div></div>)}</div><div className="pagination"><button className="secondary" disabled={page === 1 || busy} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} /> Previous</button><span>Page {page} of {Math.max(1, Math.ceil(total / 24))}</span><button className="secondary" disabled={page * 24 >= total || busy} onClick={() => setPage(p => p + 1)}>Next <ChevronRight size={16} /></button></div></div>;
}
function SettingsEditor({ settings: s, change }) {
  const [section, setSection] = useState('details');
  const groups = [
    ['Your resort identity', 'The name and the little words that make the nest yours.', Leaf, ['name', 'fullName', 'tagline']],
    ['A warm welcome starts here', 'Keep your contact details and directions easy to find.', Inbox, ['phone', 'phoneInternational', 'phoneDigits', 'email', 'address', 'location', 'maps']],
    ['Your website address', 'The home of your resort online.', Globe, ['siteUrl']]
  ];
  const socialLinks = [['instagram', 'Instagram'], ['facebook', 'Facebook'], ['linkedin', 'LinkedIn'], ['youtube', 'YouTube']];
  return <>
    <div className="section-tabs" aria-label="Settings sections">{[['details', 'Resort details'], ['brand', 'Brand & imagery'], ['seo', 'Default SEO'], ['policies', 'Guest policies']].map(([key, label]) => <button key={key} className={section === key ? 'active' : ''} aria-pressed={section === key} onClick={() => setSection(key)}>{label}</button>)}</div>
    {section === 'details' && groups.map(([title, note, Icon, keys]) => <section className="panel" key={title}><div className="panel-heading"><span className="icon-tile"><Icon size={20} /></span><div><h2>{title}</h2><p>{note}</p></div></div><div className="form-grid">{keys.map(key => <Field key={key} label={key === 'siteUrl' ? 'Live website URL' : human(key)} value={s[key]} onChange={v => change(key, v)} type={['address', 'tagline'].includes(key) ? 'textarea' : 'text'} hint={key === 'siteUrl' ? 'Your final HTTPS domain, e.g. https://thenaturenestresort.com. Used for canonical URLs, sitemap and social sharing.' : key === 'phoneDigits' ? 'International digits only; used for phone and WhatsApp links.' : undefined} />)}</div></section>)}
    {section === 'details' && <section className="panel" aria-labelledby="social-links-title"><div className="panel-heading"><span className="icon-tile"><Instagram size={20} /></span><div><h2 id="social-links-title">Follow the little moments.</h2><p>Connect the social icons in your website footer. Leave a link empty to hide its icon, then publish your changes.</p></div></div><div className="form-grid">{socialLinks.map(([key, label]) => <Field key={key} label={label + ' link'} type="url" value={s[key]} placeholder="https://…" autoCapitalize="none" spellCheck={false} onChange={v => change(key, v.trim())} hint={key === 'youtube' ? 'Paste your channel or video URL whenever it is ready.' : undefined} />)}</div></section>}
    {section === 'brand' && <section className="panel"><div className="panel-heading"><span className="icon-tile"><Sparkles size={20} /></span><div><h2>Recognisably, beautifully yours.</h2><p>Your emblem, your little details, your signature.</p></div></div><div className="brand-settings"><ImageList label="Brand emblem / logo" single images={[s.logo]} onChange={v => change('logo', v[0])} /><ImageList label="Browser favicon" single images={[s.favicon]} onChange={v => change('favicon', v[0])} />{Object.entries(s.icons).map(([kind, image]) => <ImageList key={kind} label={human(kind) + ' decorative icon'} single images={[image]} onChange={v => change('icons', { ...s.icons, [kind]: v[0] })} />)}</div></section>}
    {section === 'policies' && <section className="panel"><div className="panel-heading"><span className="icon-tile"><ShieldCheck size={20} /></span><h2>Guest information & policies</h2></div><p>Edit privacy, booking terms, cancellations, cookies and the guest guide in <strong>Pages & SEO</strong>. Each page has its own content, URL slug, update date and search preview. FAQ answers are in Banners & sections.</p><p className="muted">Confirm your actual check-in times, booking conditions and refund arrangements before adding fixed timings or charges. Contact tokens in policy text automatically use the resort details.</p></section>}
    {section === 'seo' && <SeoEditor seo={s.defaultSeo} onChange={v => change('defaultSeo', v)} path="/" siteUrl={s.siteUrl} />}
  </>;
}
function CopyEditor({
  content,
  update
}) {
  const [q, setQ] = useState(''),
    [group, setGroup] = useState('all');
  const keys = Object.keys(content.copy);
  const labels = {
    main: 'Home & pages',
    Hero: 'Home hero',
    OurStory: 'Our story',
    Header: 'Navigation',
    Footer: 'Footer',
    RoomsPage: 'Stays page',
    ClosingBanner: 'Closing banner',
    Brand3D: 'Brand & comforts'
  };
  const groups = [...new Set(keys.map(k => k.split('.')[0]))];
  return <><div className="panel"><h2>Every word, in your voice.</h2><p>These fields are connected to the website’s existing sections. Keep text lengths similar to preserve the design.</p><div className="collection-toolbar"><label className="search"><Search size={16} /><input aria-label="Search website copy" value={q} placeholder="Find a word or phrase…" onChange={e => setQ(e.target.value)} /></label><Select label="Section" value={group} onChange={setGroup} values={[["all", "All sections"], ...groups.map(k => [k, labels[k] || human(k)])]} /></div></div><div className="panel copy-fields">{keys.filter(k => (group === 'all' || k.startsWith(group + '.')) && (content.copy[k] + ' ' + (seed.copy[k] || '')).toLowerCase().includes(q.toLowerCase())).map(k => <Field key={k} label={(labels[k.split('.')[0]] || k.split('.')[0]) + ' · ' + (seed.copy[k] || k).trim().slice(0, 65)} type={content.copy[k].length > 100 ? 'textarea' : 'text'} value={content.copy[k]} onChange={v => update(c => {
        c.copy[k] = v;
      })} />)}</div></>;
}
function Banners({
  content,
  update
}) {
  const [section, setSection] = useState('heroSlides');
  const names = {
    heroSlides: 'Homepage hero',
    storyChapters: 'Our story carousel',
    roomsHero: 'Stays hero',
    homePhotos: 'Homepage photographs',
    photos: 'Page photographs',
    comforts: 'Comfort links',
    faqs: 'Guest FAQs'
  };
  const fields = {
    heroSlides: ['image', 'alt', 'eyebrow', 'title', 'accent', 'description', 'caption'],
    storyChapters: ['image', 'name', 'title', 'detail'],
    roomsHero: ['image', 'title', 'note', 'href'],
    comforts: ['kind', 'title', 'text', 'to'],
    faqs: ['question', 'answer']
  };
  const val = content[section];
  function arrayChange(index, key, value) {
    update(c => {
      c[section][index][key] = value;
    });
  }
  return <><div className="section-tabs">{Object.entries(names).map(([key, label]) => <button key={key} className={section === key ? 'active' : ''} onClick={() => setSection(key)}>{label}</button>)}</div>{Array.isArray(val) ? <>{val.map((item, index) => <section className="panel" key={section + index}><div className="panel-heading"><span className="number-label">{String(index + 1).padStart(2, '0')}</span><h2>{item.title || item.question || item.name || 'Slide'}</h2><div className="panel-tools"><button className="icon" aria-label="Move section earlier" disabled={!index} onClick={() => update(c => {
              [c[section][index], c[section][index - 1]] = [c[section][index - 1], c[section][index]];
            })}><ChevronLeft size={18} /></button><button className="icon" aria-label="Move section later" disabled={index === val.length - 1} onClick={() => update(c => {
              [c[section][index], c[section][index + 1]] = [c[section][index + 1], c[section][index]];
            })}><ChevronRight size={18} /></button><button className="icon danger" aria-label="Remove section" disabled={val.length === 1} onClick={() => update(c => c[section].splice(index, 1))}><Trash2 size={17} /></button></div></div><div className="form-grid">{fields[section].filter(k => k !== 'image').map(key => key === 'kind' ? <Select key={key} label="Icon" value={item.kind} onChange={v => arrayChange(index, key, v)} values={['stay', 'leaf', 'pool', 'dining']} /> : <Field key={key} label={human(key)} type={['answer', 'description'].includes(key) ? 'textarea' : 'text'} value={item[key]} onChange={v => arrayChange(index, key, v)} hint={['href', 'to'].includes(key) ? 'Internal page path, e.g. /rooms or /contact-us.' : key === 'alt' ? 'Describe what the photograph shows for accessibility.' : undefined} />)}</div>{item.image && <ImageList images={[item.image]} single onChange={v => arrayChange(index, 'image', v[0])} />}</section>)}<button className="secondary" onClick={() => update(c => c[section].push(clone(seed[section][0])))}><Plus size={16} /> Add {section === 'faqs' ? 'question' : 'section'}</button></> : Object.entries(val).filter(([, v]) => Array.isArray(v)).map(([key, images]) => <section className="panel" key={section + key}><ImageList label={human(key.replace(/^home/, ''))} images={images} onChange={v => update(c => {
        c[section][key] = v;
      })} /></section>)}</>;
}
function Enquiries() {
  const [data, setData] = useState({
      items: [],
      total: 0
    }),
    [page, setPage] = useState(1),
    [status, setStatus] = useState('all'),
    [error, setError] = useState(''),
    [selected, setSelected] = useState(null),
    [busy, setBusy] = useState(false);
  async function load() {
    try {
      setData(await api('/enquiries?page=' + page + '&status=' + status));
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, [page, status]);
  return <><div className="collection-toolbar"><Select label="Status" value={status} onChange={v => {
        setStatus(v);
        setPage(1);
      }} values={['all', 'new', 'in-progress', 'closed']} /><span>{data.total} requests</span></div>{error && <p className="notice error" role="alert">{error}</p>}<div className="panel enquiry-list">{!data.items.length ? <div className="empty"><Inbox size={36} /><h2>A little room for conversation.</h2><p>New contact, reservation and newsletter requests will appear here.</p></div> : data.items.map(item => <button key={item._id} onClick={() => setSelected(clone(item))}><span className="avatar">{(item.name || item.email)[0]?.toUpperCase()}</span><span><strong>{item.name || item.email}</strong><small>{item.type} · {new Date(item.createdAt).toLocaleString()}</small></span><span className={'pill ' + item.status}>{item.status}</span><ArrowUpRight size={19} /></button>)}</div><div className="pagination"><button className="secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button><span>Page {page}</span><button className="secondary" disabled={page * 30 >= data.total} onClick={() => setPage(p => p + 1)}>Next</button></div>{selected && <Modal title={selected.name || 'Newsletter request'} close={() => setSelected(null)}><div className="enquiry-detail"><span className="eyebrow">{selected.type.toUpperCase()} ENQUIRY</span><p>{selected.email && <a href={'mailto:' + selected.email}>{selected.email}</a>} {selected.phone && <a href={'tel:' + selected.phone}>{selected.phone}</a>}</p>{selected.type === 'reservation' && <div className="enquiry-dates"><strong>{selected.room}</strong><p>{selected.checkIn} → {selected.checkOut} · {selected.guests} guests</p></div>}<p className="message-body">{selected.message}</p><Select label="Follow-up status" value={selected.status} onChange={v => setSelected(s => ({
          ...s,
          status: v
        }))} values={['new', 'in-progress', 'closed']} /><Field label="Internal notes" type="textarea" value={selected.notes || ''} onChange={v => setSelected(s => ({
          ...s,
          notes: v
        }))} /><button className="primary" disabled={busy} onClick={async () => {
          setBusy(true);
          try {
            await api('/enquiries/' + selected._id, {
              method: 'PATCH',
              body: {
                status: selected.status,
                notes: selected.notes || ''
              }
            });
            setSelected(null);
            await load();
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}>Save follow-up <Check size={16} /></button></div></Modal>}</>;
}
function Versions({
  restore
}) {
  const [items, setItems] = useState([]),
    [error, setError] = useState('');
  useEffect(() => {
    api('/revisions').then(d => setItems(d.items)).catch(e => setError(e.message));
  }, []);
  return <section className="panel"><h2>Room to change your mind.</h2><p>Each save keeps the previous draft. Restore it into the editor, review, then publish.</p>{error && <p role="alert">{error}</p>}{items.length ? items.map(r => <div className="revision" key={r.version}><History size={20} /><div><strong>Before version {r.version}</strong><small>{new Date(r.at).toLocaleString()} · {r.by} · {r.published ? 'Publish' : 'Draft save'}</small></div><button className="secondary" onClick={async () => {
        try {
          restore((await api('/revisions/' + r.version)).content);
        } catch (e) {
          setError(e.message);
        }
      }}>Restore draft</button></div>) : <div className="empty"><History size={30} /><p>Your first save will create the first revision.</p></div>}</section>;
}
function Account({
  email
}) {
  const [current, setCurrent] = useState(''),
    [password, setPassword] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false);
  return <section className="panel account-panel"><ShieldCheck size={28} /><h2>A space just for you.</h2><p>Signed in as <strong>{email}</strong>.</p><form onSubmit={async e => {
      e.preventDefault();
      setBusy(true);
      try {
        await api('/password', {
          method: 'POST',
          body: {
            currentPassword: current,
            password
          }
        });
        setNotice('Password updated. Other sessions have been signed out.');
        setCurrent('');
        setPassword('');
      } catch (e) {
        setNotice(e.message);
      } finally {
        setBusy(false);
      }
    }}><Field label="Current password" type="password" value={current} onChange={setCurrent} required autoComplete="current-password" /><Field label="New password" type="password" value={password} onChange={setPassword} minLength={12} maxLength={128} required autoComplete="new-password" hint="At least 12 characters. Use a unique password." /><button className="primary" disabled={busy}>Update password</button>{notice && <p role="status">{notice}</p>}</form></section>;
}
createRoot(document.getElementById('root')).render(<App />);
