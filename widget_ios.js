// DESK 아이폰 위젯 (Scriptable). 위젯 설정의 Parameter: plan(기본) / card / overview / board(꾸민 위젯 판)
// 앱(또는 단축어 '앱에서 실행')으로 돌리면 꾸민 위젯 판 사진을 새로 찍어둠
const DB = "https://tracker-d3a39-default-rtdb.firebaseio.com/";
const SITE = "https://tracker-tau-seven.vercel.app/";
const _P = String((args.widgetParameter || (typeof WMODE !== 'undefined' ? WMODE : '') || (config.runsInWidget ? 'plan' : 'board'))).trim().toLowerCase();
const MODE = _P.startsWith('c') ? 'card' : _P.startsWith('o') ? 'ov' : _P.startsWith('b') ? 'board' : 'plan';
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

const BOARD = fm.joinPath(fm.documentsDirectory(), 'desk_board.png');
async function snapBoard() {
  const wv = new WebView();
  await wv.loadURL(SITE + 'overview.html?snap=1&pr=4&t=' + Date.now());
  const r = await wv.evaluateJavaScript(`(function(){var t0=Date.now();(function chk(){if(window.__wbResult)return completion(window.__wbResult);if(Date.now()-t0>110000)return completion('ERR:timeout');setTimeout(chk,300);})();})()`, true);
  if (!r || String(r).startsWith('ERR')) return String(r || 'ERR');
  try { DIAG = String(await wv.evaluateJavaScript('window.__wbDiag||""') || ''); } catch (e) {}
  const img = Image.fromData(Data.fromBase64String(String(r).split(',')[1]));
  fm.writeImage(BOARD, img); return '';
}
let SNAPERR = '', DIAG = '';
if (!config.runsInWidget) { try { SNAPERR = await snapBoard(); } catch (e) { SNAPERR = String(e && e.message || e); } }

const w = new ListWidget();
if (!ACC) { w.backgroundColor = BG; w.setPadding(14, 15, 12, 15); }

if (MODE === 'board') {
  w.setPadding(0, 0, 0, 0); w.url = SITE + 'overview.html';
  if (fm.fileExists(BOARD)) w.backgroundImage = fm.readImage(BOARD);
  else { w.setPadding(14, 15, 12, 15); const t = w.addText(SNAPERR ? '찍기 실패 · ' + SNAPERR : '—'); t.font = F(11); t.textColor = SUB; }
  if (DIAG && !config.runsInWidget) { w.addSpacer(); const t = w.addText('빠진 사진\n' + DIAG); t.font = F(8); t.textColor = new Color('#c94c4c'); }
  if (SNAPERR && fm.fileExists(BOARD) && !config.runsInWidget) { w.addSpacer(); const t = w.addText('찍기 실패 · ' + SNAPERR); t.font = F(9); t.textColor = new Color('#c94c4c'); }
} else if (MODE === 'ov') {
  const B = 'study_records/my_study_data_final10/';
  const [pd, tg, trk, dd] = await Promise.all([getJSON(B + 'plannerData', 'pd'), getJSON(B + 'plannerTags', 'tg'), getJSON(B + 'trackerData', 'trk'), getJSON(B + 'myDday', 'dd')]);
  const P = parse(pd) || {}, TAGS = arr(parse(tg)), TR = parse(trk) || {};
  const now = new Date(); if (now.getHours() < 5) now.setDate(now.getDate() - 1); now.setHours(0, 0, 0, 0);
  const keyOf = d => (d.getMonth() + 1) + '.' + d.getDate();
  const MON = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  // D-day
  let ddTxt = '';
  if (dd && typeof dd === 'string') { const t = new Date(dd); if (!isNaN(t)) { t.setHours(0, 0, 0, 0); const df = Math.round((t - now) / 864e5); ddTxt = df > 0 ? 'D-' + df : df === 0 ? 'D-Day' : 'D+' + (-df); } }
  // 사이클 (진행 중)
  const THEMES = ['#5a97eb', '#ff6b6b', '#4ecdc4', '#ffa62b', '#9b5de5'];
  const yr = now.getFullYear();
  const pdt = x => { const q = String(x || '').trim().split('.'); if (q.length !== 2) return null; const m = +q[0], d = +q[1]; return isNaN(m) || isNaN(d) ? null : new Date(yr, m - 1, d); };
  const data = (TR && TR.data) || {}; const cyc = [];
  Object.keys(data).forEach(sub => arr(data[sub] && data[sub].cycles).forEach(cy => {
    if (!cy) return; const cats = arr(cy.cats); const all = [];
    cats.forEach(c => arr(c && c.sessions).forEach(se => arr(se && se.bars).forEach(b => { const d = pdt(b && b.text); if (d) all.push(d); })));
    if (!all.length) return; const st = new Date(Math.min(...all)); let en = null;
    const last = cats[cats.length - 1]; if (last) { const N = arr(last.topics).length; const f = arr(last.sessions)[0]; const eb = f && arr(f.bars).find(b => b.end === N - 1); if (eb) en = pdt(eb.text); }
    if (!en) cyc.push({ name: sub + ' ' + (cy.num != null ? cy.num : ''), color: THEMES[cy.palIdx || 0] || THEMES[0], st, n: Math.floor((now - st) / 864e5) + 1 });
  }));
  cyc.sort((a, b) => a.st - b.st);
  // 못한 것 (이번 주 월요일 ~ 어제)
  const ord = TAGS.map(t => t.id);
  const PS = /^(PSAT|피셋)?\s*[(\[]?\s*(자료|언어|상황|계산연습|계산)?\s*[)\]]?$/i;
  const grp = id => { const t = TAGS.find(x => x.id === id) || { name: id, color: '#bbb' }; const nm = String(t.name || id).trim(); if (/^[☆★✩✪✫✬✭✮✯⭐\s*]+$/.test(nm)) return null; const m = nm.match(PS);
    if (m && (m[1] || m[2])) { const pt = TAGS.find(x => /^(PSAT|피셋)$/i.test(String(x.name).trim())); return { id: 'PSAT', name: 'PSAT', color: hexOk(pt ? pt.color : t.color) || '#bbb', pos: Math.min(...TAGS.map((x, i) => { const mm = String(x.name).trim().match(PS); return mm && (mm[1] || mm[2]) ? i : 999; })) }; }
    return { id, name: nm, color: hexOk(t.color) || '#bbb', pos: ord.indexOf(id) }; };
  const DW = ['일', '월', '화', '수', '목', '금', '토'];
  const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const G = new Map();
  for (let d = new Date(mon); d < now; d.setDate(d.getDate() + 1)) {
    const day = P[keyOf(d)]; if (!day) continue;
    arr(day.items).forEach(it => { if (!it) return; const subs = arr(it.subItems); const done = it.hl || subs.some(x => x.hl); const miss = [];
      if (done) { if (!it.hl) subs.filter(x => !x.hl && x.text).forEach(x => miss.push((it.text ? strip(it.text) + ' · ' : '') + strip(x.text))); }
      else if (it.text) miss.push(strip(it.text));
      if (!miss.length) return; const g = it.tag ? grp(it.tag) : null; if (!g) return;
      if (!G.has(g.id)) G.set(g.id, { g, rows: new Map() });
      const Rw = G.get(g.id).rows; miss.forEach(tx => { const r = Rw.get(tx) || { tx, days: [] }; const dw = DW[d.getDay()]; if (!r.days.includes(dw)) r.days.push(dw); Rw.set(tx, r); }); });
  }
  const groups = [...G.values()].sort((a, b) => a.g.pos - b.g.pos);
  w.url = SITE;
  const lbl = (st, t) => { const x = st.addText(t); x.font = F(9.5, 'm'); x.textColor = SUB; return x; };
  const cycRow = (st, c, sz) => { const r = st.addStack(); r.centerAlignContent(); r.spacing = 6; const a = r.addText(c.name.trim()); a.font = F(sz, 'b'); a.textColor = new Color(c.color); a.lineLimit = 1; a.minimumScaleFactor = .7;
    const b = r.addText(`${c.st.getMonth() + 1}.${c.st.getDate()} ~ ${c.n}일째`); b.font = F(sz - 2); b.textColor = SUB; b.lineLimit = 1; };
  if (ACC) {
    const t = w.addText(ddTxt || keyOf(now)); t.font = F(14, 'b');
    cyc.slice(0, 2).forEach(c => { const x = w.addText(`${c.name.trim()} · ${c.n}일째`); x.font = F(11); x.lineLimit = 1; });
  } else if (FAM === 'small') {
    if (ddTxt) { const t = w.addText(ddTxt); t.font = F(28, 'b'); t.textColor = INK; t.minimumScaleFactor = .6; t.lineLimit = 1; }
    const dt = w.addText(`${MON[now.getMonth()].slice(0, 3)} ${now.getDate()} ${DOW[now.getDay()]}`); dt.font = F(10, 'm'); dt.textColor = SUB;
    w.addSpacer(8);
    cyc.slice(0, 3).forEach(c => { const x = w.addText(`${c.name.trim()}`); x.font = F(11, 'b'); x.textColor = new Color(c.color); x.lineLimit = 1; const y = w.addText(`${c.n}일째`); y.font = F(10); y.textColor = SUB; w.addSpacer(3); });
    w.addSpacer();
  } else {
    const head = w.addStack(); head.bottomAlignContent();
    const a = head.addText(`${MON[now.getMonth()]} ${now.getDate()}`); a.font = F(FAM === 'medium' ? 16 : 19, 'b'); a.textColor = INK;
    head.addSpacer(6); const b = head.addText(DOW[now.getDay()]); b.font = F(10, 'm'); b.textColor = SUB;
    head.addSpacer();
    if (ddTxt) { const c = head.addText(ddTxt); c.font = F(FAM === 'medium' ? 20 : 24, 'b'); c.textColor = INK; }
    w.addSpacer(FAM === 'medium' ? 8 : 12);
    if (FAM === 'medium') {
      const row = w.addStack(); row.topAlignContent(); row.spacing = 14;
      const L = row.addStack(); L.layoutVertically(); lbl(L, 'CYCLE'); L.addSpacer(4);
      if (!cyc.length) lbl(L, '—'); cyc.slice(0, 3).forEach(c => { cycRow(L, c, 12); L.addSpacer(3); });
      const Rr = row.addStack(); Rr.layoutVertically(); lbl(Rr, 'UNFINISHED'); Rr.addSpacer(4);
      let n = 0; if (!groups.length) lbl(Rr, '—');
      groups.forEach(g => { if (n >= 4) return; const h = Rr.addStack(); h.centerAlignContent(); h.spacing = 5; const dot = h.addStack(); dot.size = new Size(6, 6); dot.cornerRadius = 3; dot.backgroundColor = new Color(g.g.color);
        const t = h.addText(`${g.g.name} ${g.rows.size}`); t.font = F(11, 'b'); t.textColor = INK; n++; Rr.addSpacer(2); });
    } else {
      lbl(w, 'CYCLE'); w.addSpacer(5);
      if (!cyc.length) lbl(w, '—'); cyc.forEach(c => { cycRow(w, c, 13); w.addSpacer(4); });
      w.addSpacer(8); lbl(w, 'UNFINISHED'); w.addSpacer(5);
      if (!groups.length) { const n = w.addText('—'); n.font = F(14); n.textColor = SUB; }
      let lines = 0; const MAXL = FAM === 'extraLarge' ? 16 : 10;
      groups.forEach(g => { if (lines >= MAXL) return;
        const h = w.addStack(); h.centerAlignContent(); h.spacing = 6; const dot = h.addStack(); dot.size = new Size(7, 7); dot.cornerRadius = 3.5; dot.backgroundColor = new Color(g.g.color);
        const t = h.addText(g.g.name); t.font = F(12, 'b'); t.textColor = INK; lines++; w.addSpacer(2);
        [...g.rows.values()].forEach(r => { if (lines >= MAXL) return; const rw = w.addStack(); rw.setPadding(0, 13, 0, 0); rw.centerAlignContent();
          const x = rw.addText(r.tx); x.font = F(12); x.textColor = INK; x.lineLimit = 1; rw.addSpacer(); const y = rw.addText(r.days.join('·')); y.font = F(10); y.textColor = SUB; lines++; w.addSpacer(2); });
        w.addSpacer(4); });
    }
    w.addSpacer();
  }
  w.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000);
} else if (MODE === 'plan') {
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
if (!config.runsInWidget && !config.runsInApp) Script.setWidget(w);
Script.complete();
