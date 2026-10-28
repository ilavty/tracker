// DESK 아이폰 위젯 (Scriptable). 위젯 설정의 Parameter: plan(기본) / card
const DB = "https://tracker-d3a39-default-rtdb.firebaseio.com/";
const SITE = "https://tracker-tau-seven.vercel.app/";
const MODE = String((args.widgetParameter || (typeof WMODE !== 'undefined' ? WMODE : '') || 'plan')).trim().toLowerCase().startsWith('c') ? 'card' : 'plan';
const FAM = config.widgetFamily || 'large';
const ACC = FAM.startsWith('accessory');
const fm = FileManager.local();
const cachePath = n => fm.joinPath(fm.cacheDirectory(), 'desk_w_' + n + '.json');

let ERR = '';
async function getJSON(path, key) {
  try {
    const r = new Request(DB + path + '.json'); r.timeoutInterval = 30;
    const v = JSON.parse(await r.loadString());
    if (v && typeof v === 'object' && v.error) throw new Error(String(v.error));
    if (v != null) fm.writeString(cachePath(key), JSON.stringify(v));
    return v;
  } catch (e) {
    ERR = String(e && e.message || e);
    try { const c = JSON.parse(fm.readString(cachePath(key))); if (c != null) ERR = ''; return c; } catch (_) { return null; }
  }
}
const parse = v => { if (v == null) return null; if (typeof v === 'string') { try { return JSON.parse(v); } catch (e) { return null; } } return v; };
const arr = x => Array.isArray(x) ? x.filter(v => v != null) : (x && typeof x === 'object' ? Object.values(x).filter(v => v != null) : []);
const strip = s => String(s == null ? '' : s).replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
const C = (l, d) => Color.dynamic(new Color(l), new Color(d || l));
const INK = C('#111111', '#f2f2f2'), SUB = C('#8a8f98', '#9aa0a8'), BG = C('#ffffff', '#141414');
const F = (s, w) => w === 'b' ? Font.boldSystemFont(s) : w === 'm' ? Font.mediumSystemFont(s) : Font.regularSystemFont(s);
const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
function hexOk(h) { return /^#?[0-9a-f]{6}$/i.test(String(h || '')) ? (h[0] === '#' ? h : '#' + h) : null; }
function lum(h) { const n = parseInt(h.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; }

const w = new ListWidget();
if (!ACC) { w.backgroundColor = BG; w.setPadding(14, 15, 12, 15); }

if (MODE === 'plan') {
  const [pd, tg] = await Promise.all([getJSON('study_records/my_study_data_final10/plannerData', 'pd'), getJSON('study_records/my_study_data_final10/plannerTags', 'tg')]);
  const P = parse(pd) || {}, TAGS = arr(parse(tg));
  const d = new Date(); if (d.getHours() < 5) d.setDate(d.getDate() - 1);
  const key = (d.getMonth() + 1) + '.' + d.getDate();
  const day = P[key] || { items: [] };
  const rows = [];
  arr(day.items).forEach(it => {
    const t = TAGS.find(x => x.id === it.tag) || {};
    rows.push({ tag: t.name || it.tag || '', color: hexOk(t.color) || '#c9c9c9', text: strip(it.text), hl: it.hl });
    arr(it.subItems).forEach(s => rows.push({ tag: '', color: hexOk(t.color) || '#c9c9c9', text: strip(s.text), hl: s.hl, sub: true }));
  });
  w.url = SITE;
  if (ACC) {
    const left = rows.filter(r => !r.hl);
    const h = w.addText(`${key} · ${rows.length - left.length}/${rows.length}`); h.font = F(12, 'b');
    left.slice(0, 2).forEach(r => { const t = w.addText((r.tag ? r.tag + ' ' : '') + r.text); t.font = F(12); t.lineLimit = 1; });
  } else {
    const head = w.addStack(); head.centerAlignContent();
    const a = head.addText(key); a.font = F(FAM === 'small' ? 20 : 22, 'b'); a.textColor = INK;
    head.addSpacer(6);
    const b = head.addText(DOW[d.getDay()]); b.font = F(11, 'm'); b.textColor = SUB;
    head.addSpacer();
    if (day.studyTime) { const st = head.addText(String(day.studyTime)); st.font = F(12, 'm'); st.textColor = SUB; }
    w.addSpacer(9);
    const max = FAM === 'small' ? 5 : FAM === 'medium' ? 5 : FAM === 'extraLarge' ? 14 : 12;
    if (!rows.length) { const n = w.addText(ERR ? '불러오기 실패 · ' + ERR : (pd == null ? '데이터 없음' : '—')); n.font = F(ERR || pd == null ? 11 : 18); n.textColor = SUB; }
    rows.slice(0, max).forEach((r, i) => {
      const s = w.addStack(); s.centerAlignContent(); s.spacing = 6;
      if (FAM !== 'small') {
        const chip = s.addStack(); chip.size = new Size(44, 16); chip.cornerRadius = 4; chip.centerAlignContent();
        if (r.tag) { chip.backgroundColor = new Color(r.color); const ct = chip.addText(r.tag); ct.font = F(8.5, 'b'); ct.textColor = lum(r.color) > .62 ? new Color('#111111') : Color.white(); ct.lineLimit = 1; ct.minimumScaleFactor = .6; }
      } else {
        const dot = s.addStack(); dot.size = new Size(6, 6); dot.cornerRadius = 3; dot.backgroundColor = new Color(r.color);
      }
      const box = s.addStack(); box.setPadding(1, 4, 1, 4); box.cornerRadius = 3;
      const hc = hexOk(r.hl); if (hc) box.backgroundColor = new Color(hc, .75);
      const t = box.addText(r.text); t.font = F(FAM === 'small' ? 12 : 13, hc ? 'm' : 'r'); t.lineLimit = 1;
      t.textColor = hc ? new Color('#111111') : INK;
      if (i < Math.min(rows.length, max) - 1) w.addSpacer(FAM === 'small' ? 4 : 5);
    });
    if (rows.length > max) { w.addSpacer(4); const m = w.addText('+' + (rows.length - max)); m.font = F(11, 'm'); m.textColor = SUB; }
    w.addSpacer();
  }
  w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);
} else {
  const raw = await getJSON('flashcards_data/v1/json', 'cards');
  const S = parse(raw) || {};
  const del = S.deleted || {};
  const subs = arr(S.subjects);
  const cards = arr(S.cards).filter(c => !del[c.id] && (strip(c.title) || arr(c.items).length));
  w.url = SITE + 'cards.html';
  if (!cards.length) { const n = w.addText(ERR ? '불러오기 실패 · ' + ERR : '—'); n.font = F(ERR ? 11 : 18); n.textColor = SUB; }
  else {
    const c = cards[Math.floor(Math.random() * cards.length)];
    const sub = subs.find(s => s.id === c.subjectId);
    const items = arr(c.items).filter(i => strip(i.text) || strip(i.label));
    if (ACC) {
      const t = w.addText(strip(c.title) || strip(items[0] && items[0].label)); t.font = F(13, 'b'); t.lineLimit = 2;
      if (items[0]) { const x = w.addText(strip(items[0].text)); x.font = F(11); x.lineLimit = 1; }
    } else {
      if (sub) { const s = w.addText(sub.name.toUpperCase()); s.font = F(10, 'm'); s.textColor = SUB; w.addSpacer(6); }
      const t = w.addText(strip(c.title) || strip(items[0] && items[0].label) || ''); t.font = F(FAM === 'small' ? 17 : 20, 'b'); t.textColor = INK; t.lineLimit = FAM === 'small' ? 3 : 2; t.minimumScaleFactor = .7;
      w.addSpacer(8);
      const max = FAM === 'small' ? 2 : FAM === 'medium' ? 2 : 7;
      items.slice(0, max).forEach(i => {
        const st = w.addStack(); st.spacing = 6;
        if (strip(i.label) && strip(i.label) !== strip(c.title)) { const l = st.addText(strip(i.label)); l.font = F(11, 'b'); l.textColor = new Color('#5b8fc7'); l.lineLimit = 1; }
        const x = st.addText(strip(i.text)); x.font = F(12); x.textColor = INK; x.lineLimit = FAM === 'large' ? 3 : 2;
        w.addSpacer(4);
      });
      w.addSpacer();
    }
  }
  w.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000);
}

if (config.runsInWidget) Script.setWidget(w);
else if (MODE === 'card') await w.presentMedium(); else await w.presentLarge();
Script.complete();
