// Charts drawn with SVG. Every chart also gets a text table (in a <details>) for screen readers.
import { el } from './dom.js';

const NS = 'http://www.w3.org/2000/svg';
function s(tag, attrs = {}) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

// Progress ring: percent from 0 to 100
export function donut(percent, centreTop, centreBottom, label) {
  const r = 52, c = 2 * Math.PI * r;
  const svg = s('svg', { viewBox: '0 0 140 140', role: 'img', 'aria-label': label, width: 200, height: 200, focusable: 'false' });
  svg.append(s('circle', { class: 'ring-track', cx: 70, cy: 70, r, fill: 'none', 'stroke-width': 16 }));
  const fill = s('circle', { class: 'ring-fill', cx: 70, cy: 70, r, fill: 'none', 'stroke-width': 16,
    transform: 'rotate(-90 70 70)', 'stroke-dasharray': c, 'stroke-dashoffset': c });
  svg.append(fill);
  requestAnimationFrame(() => fill.setAttribute('stroke-dashoffset', c * (1 - Math.min(100, Math.max(0, percent)) / 100)));
  const wrap = el('div', { class: 'ring-wrap' }, svg,
    el('div', { class: 'ring-label' }, el('strong', { text: centreTop }), el('span', { text: centreBottom })));
  return wrap;
}

// Vertical bars. data = [{ label, value, highlight }]
export function barChart(data, unit, label) {
  const W = 440, H = 230, padL = 36, padB = 34, padT = 24;
  const max = Math.max(10, ...data.map((d) => d.value));
  const niceMax = Math.ceil(max / 25) * 25;
  const bw = (W - padL - 10) / data.length;
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': label, focusable: 'false' });
  for (let i = 0; i <= 2; i++) {
    const y = padT + ((H - padT - padB) * i) / 2;
    svg.append(s('line', { class: 'chart-grid', x1: padL, x2: W - 6, y1: y, y2: y }));
    const t = s('text', { class: 'chart-label', x: padL - 6, y: y + 4, 'text-anchor': 'end' });
    t.textContent = String(Math.round(niceMax - (niceMax * i) / 2));
    svg.append(t);
  }
  data.forEach((d, i) => {
    const h = ((H - padT - padB) * d.value) / niceMax;
    const x = padL + i * bw + bw * 0.18;
    const y = H - padB - h;
    svg.append(s('rect', { class: d.highlight ? 'chart-bar-today' : 'chart-bar', x, y, width: bw * 0.64, height: Math.max(h, d.value ? 3 : 0), rx: 6 }));
    const lab = s('text', { class: 'chart-label', x: x + bw * 0.32, y: H - 12, 'text-anchor': 'middle' });
    lab.textContent = d.label;
    svg.append(lab);
    if (d.value) {
      const val = s('text', { class: 'chart-value', x: x + bw * 0.32, y: y - 6, 'text-anchor': 'middle' });
      val.textContent = String(d.value);
      svg.append(val);
    }
  });
  svg.append(s('line', { class: 'chart-axis', x1: padL, x2: W - 6, y1: H - padB, y2: H - padB }));
  return svg;
}

// Text version of a chart for people who cannot see it
export function dataTable(summaryText, caption, headings, rows) {
  return el('details', { class: 'data-table' },
    el('summary', { text: summaryText }),
    el('table', {},
      el('caption', { text: caption }),
      el('thead', {}, el('tr', {}, headings.map((h) => el('th', { scope: 'col', text: h })))),
      el('tbody', {}, rows.map((r) => el('tr', {}, r.map((cell, i) => i === 0 ? el('th', { scope: 'row', text: cell }) : el('td', { text: cell })))))
    )
  );
}
