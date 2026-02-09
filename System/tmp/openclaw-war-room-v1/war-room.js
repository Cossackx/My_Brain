const state = {
  agents: [
    { id: 'main', name: 'Main', role: 'Coordinator', mode: 'active', last: 'processing session events' },
    { id: 'research', name: 'Research', role: 'Signal Analyst', mode: 'idle', last: 'waiting for trigger' },
    { id: 'ops', name: 'Ops', role: 'Runtime Operator', mode: 'active', last: 'watching gateway health' },
    { id: 'memory', name: 'Memory', role: 'Context Curator', mode: 'idle', last: 'digest scheduled' },
  ],
  tasks: [
    { title: 'Wire real event relay', owner: 'Ops', state: 'queued' },
    { title: 'Kanban UX pass', owner: 'Main', state: 'running' },
    { title: 'Add chat filters', owner: 'Research', state: 'blocked' },
    { title: 'Ship visual v2', owner: 'Main', state: 'done' },
  ],
  chats: [
    { session: 'agent:main:main', messages: ['Main: started war-room iteration', 'Ops: gateway status stable'] },
    { session: 'agent:research:1', messages: ['Research: scanning inspiration feeds', 'Main: summarize 3 actionable patterns'] },
    { session: 'agent:ops:2', messages: ['Ops: update completed 2026.2.9', 'Main: proceed to visual pass'] },
    { session: 'agent:memory:3', messages: ['Memory: digest candidate queued', 'Main: capture endpoint heuristics'] },
  ],
  events: [],
};

const el = {
  roster: document.getElementById('roster-grid'),
  feed: document.getElementById('feed-list'),
  kanban: document.getElementById('kanban-grid'),
  chats: document.getElementById('chat-grid'),
  agents: document.getElementById('agent-count'),
  events: document.getElementById('event-count'),
};

const lanes = ['queued', 'running', 'blocked', 'done'];
const laneTitle = { queued: 'Queued', running: 'Running', blocked: 'Blocked', done: 'Done' };

function modeDot(mode) { return mode === 'active' ? 'active' : mode === 'idle' ? 'idle' : 'stale'; }
function now() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }

function render() {
  el.roster.innerHTML = state.agents.map(a => `
    <article class="agent-card">
      <div class="agent-head"><div><div class="agent-name">${a.name}</div><div class="agent-role">${a.role}</div></div>
      <div class="agent-role"><span class="dot ${modeDot(a.mode)}"></span>${a.mode}</div></div>
      <div class="agent-role" style="margin-top:8px">${a.last}</div>
    </article>`).join('');

  el.kanban.innerHTML = lanes.map(l => {
    const cards = state.tasks.filter(t => t.state === l).map(t => `<article class="card"><div><strong>${t.title}</strong></div><div class="meta">${t.owner}</div></article>`).join('');
    return `<section class="lane"><h3>${laneTitle[l]}</h3>${cards || '<div class="meta">No items</div>'}</section>`;
  }).join('');

  el.chats.innerHTML = state.chats.map(c => `
    <article class="chat-pane">
      <div class="chat-head"><span>${c.session}</span><span>live</span></div>
      ${c.messages.slice(-5).map(m => `<p class="msg"><b>${m.split(':')[0]}:</b> ${m.split(':').slice(1).join(':').trim()}</p>`).join('')}
    </article>`).join('');

  el.feed.innerHTML = state.events.slice(0, 120).map(evt => `
    <article class="feed-item"><div class="meta">${evt.time} • ${evt.agent} • ${evt.stream}</div><div class="text">${evt.text}</div></article>
  `).join('');

  el.agents.textContent = String(state.agents.length);
  el.events.textContent = String(state.events.length);
}

function pushEvent(agent, stream, text) {
  state.events.unshift({ time: now(), agent, stream, text });
  if (state.events.length > 240) state.events.length = 240;
  const idx = Math.floor(Math.random() * state.chats.length);
  state.chats[idx].messages.push(`${agent}: ${text}`);
  if (state.chats[idx].messages.length > 8) state.chats[idx].messages.shift();
  render();
}

setInterval(() => {
  const samples = [
    ['Main', 'lifecycle', 'run started for session agent:main:main'],
    ['Ops', 'tool', 'gateway status check completed'],
    ['Research', 'assistant', 'summarized 3 source signals for planning'],
    ['Memory', 'lifecycle', 'digest candidate queued for review'],
  ];
  const [agent, stream, text] = samples[Math.floor(Math.random() * samples.length)];
  pushEvent(agent, stream, text);
}, 2300);

render();
pushEvent('System', 'note', 'Kanban + multi-chat pass active. Next: real Gateway relay wiring.');
