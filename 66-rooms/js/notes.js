// Chapter notes, kept in this browser only.
const KEY = '66rooms:genesis:notes';

export class Notes {
  constructor() {
    this.data = {};
    this.ok = true;
    try { this.data = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { this.data = {}; this.ok = false; }
  }

  get(ch) { return this.data[ch] || ''; }

  set(ch, text) {
    if (text.trim()) this.data[ch] = text; else delete this.data[ch];
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); this.ok = true; } catch { this.ok = false; }
    return this.ok;
  }

  chapters() { return Object.keys(this.data).map(Number).sort((a, b) => a - b); }

  count() { return this.chapters().length; }

  inRange([a, b]) { return this.chapters().filter((c) => c >= a && c <= b); }

  toMarkdown(stations) {
    const lines = ['# Genesis — my notes', '', '_From 66 Rooms · Room 1_', ''];
    stations.forEach((s, i) => {
      const chs = this.inRange(s.chapters);
      if (!chs.length) return;
      lines.push(`## ${i + 1}. ${s.title}`, '');
      chs.forEach((c) => lines.push(`**Genesis ${c}**`, '', this.get(c).trim(), ''));
    });
    return lines.join('\n');
  }
}
