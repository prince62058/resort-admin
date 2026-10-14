import { Instagram, Plus, ArrowUp, ArrowDown, Trash2, Play, ExternalLink } from 'lucide-react';
import { instagramReelUrl, directVideoUrl } from '../shared/reels.js';
import './reels-editor.css';

export default function ReelsEditor({ config, change, ImageList }) {
  function update(id, key, value) {
    change({ ...config, items: config.items.map(item => item.id === id ? { ...item, [key]: value } : item) });
  }
  function move(index, direction) {
    const items = [...config.items];
    [items[index], items[index + direction]] = [items[index + direction], items[index]];
    change({ ...config, items });
  }
  return <div className="reels-editor">
    <section className="panel reels-intro"><div><span className="eyebrow">SMALL SCREEN. A LITTLE ESCAPE.</span><h2>Let your moments do the talking.</h2><p>Reels appear in the website’s bottom-left corner. Guests tap a card to open a larger player without leaving the page.</p></div><Instagram size={38} /></section>
    <section className="panel"><div className="panel-heading"><Instagram size={21} /><h2>Corner reel settings</h2></div><div className="form-grid"><label className="field"><span>Widget heading</span><input value={config.label} maxLength={70} onChange={e => change({ ...config, label: e.target.value })} /></label><label className="toggle"><input type="checkbox" checked={config.enabled} onChange={e => change({ ...config, enabled: e.target.checked })} /><span>Show reels on the website</span></label></div><p className="muted">Add a public Instagram Reel link, choose a cover, then Publish changes. The account must allow embedding. Instagram controls playback and may require another tap or a login. Covers are selected from your media library, not fetched from Instagram.</p></section>
    {config.items.map((reel, index) => {
      const url = instagramReelUrl(reel.url);
      const invalidVideo = Boolean(reel.videoUrl && !directVideoUrl(reel.videoUrl));
      return <section className="panel reel-editor-item" key={reel.id} aria-label={'Reel ' + (index + 1)}>
        <div className="reel-editor-top"><div><span className="reel-editor-number">{String(index + 1).padStart(2, '0')}</span><h2>{reel.title || 'New reel'}</h2></div><div className="reel-editor-actions"><button className="icon" disabled={index === 0} aria-label={'Move reel ' + (index + 1) + ' earlier'} onClick={() => move(index, -1)}><ArrowUp size={17} /></button><button className="icon" disabled={index === config.items.length - 1} aria-label={'Move reel ' + (index + 1) + ' later'} onClick={() => move(index, 1)}><ArrowDown size={17} /></button><button className="icon danger" aria-label={'Remove reel ' + (index + 1)} onClick={() => change({ ...config, items: config.items.filter(item => item.id !== reel.id) })}><Trash2 size={17} /></button></div></div>
        <div className="reel-editor-grid"><div>
          <label className="field"><span>Reel title</span><input value={reel.title} maxLength={80} onChange={e => update(reel.id, 'title', e.target.value)} required /></label>
          <label className="field"><span>Instagram Reel link</span><input type="url" value={reel.url} placeholder="https://www.instagram.com/reel/…/" aria-invalid={Boolean(reel.url && !url)} onChange={e => update(reel.id, 'url', e.target.value)} onBlur={() => { if (url) update(reel.id, 'url', url); }} required />{reel.url && !url && <small className="reel-validation">Use an HTTPS instagram.com/reel/… link, not a profile or embed code.</small>}</label>
          <label className="toggle"><input type="checkbox" checked={reel.enabled} onChange={e => update(reel.id, 'enabled', e.target.checked)} /><span>Show this reel</span></label>
          <details className="reel-video-options"><summary>Moving preview · optional video link</summary><p>For a muted, looping preview and native playback, add a direct HTTPS MP4 or WebM URL for a video you own or have permission to use. An Instagram page link cannot be used as a video file. Leave empty to use the cover and Instagram player.</p><label className="field"><span>Direct video URL (optional)</span><input type="url" value={reel.videoUrl} placeholder="https://your-media-host/video.mp4" aria-invalid={invalidVideo} onChange={e => update(reel.id, 'videoUrl', e.target.value)} />{invalidVideo && <small className="reel-validation">Use a direct HTTPS URL ending in .mp4 or .webm.</small>}</label></details>
        </div><div className="reel-editor-cover"><ImageList single label="Preview cover" images={reel.poster ? [reel.poster] : []} onChange={images => update(reel.id, 'poster', images[0] || '')} />{url && <a className="text-button" href={url} target="_blank" rel="noopener noreferrer"><Play size={14} /> Check reel on Instagram <ExternalLink size={14} /></a>}</div></div>
      </section>;
    })}
    <button className="secondary reel-add" disabled={config.items.length >= 6} onClick={() => change({ ...config, items: [...config.items, { id: crypto.randomUUID(), title: 'A moment at the nest', url: '', poster: '', videoUrl: '', enabled: true }] })}><Plus size={18} /> Add reel <span>{config.items.length} / 6</span></button>
    <p className="muted">Use the arrows to arrange your reels. Guests see two previews at a time and can browse the rest. Save a draft to keep changes private; publish when ready.</p>
  </div>;
}
