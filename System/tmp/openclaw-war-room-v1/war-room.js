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
  codexTasks: [
    {
      title: 'Evaluate Voxyz info quality',
      preview: 'Need confidence scoring + source audit.',
      age: '32m',
      unread: 0,
      messages: [
        { who: 'Main', line: 'Started war-room iteration and visual pass.' },
        { who: 'Research', line: 'Summarized 3 source signals for planning.' },
      ],
    },
    {
      title: 'Tweet ideas for OpenClaw',
      preview: 'Rank hooks by CTR potential and novelty.',
      age: '1h',
      unread: 2,
      messages: [
        { who: 'Ops', line: 'Gateway status check completed, no regressions.' },
        { who: 'System', line: 'Next objective: real Gateway relay wiring.' },
      ],
    },
    {
      title: 'App Store Connect CLI uses',
      preview: 'Clarify auth flow and practical commands.',
      age: '1h',
      unread: 0,
      messages: [
        { who: 'Main', line: 'Map command groups and likely developer workflow.' },
      ],
    },
    {
      title: 'Gateway relay wiring',
      preview: 'Map event stream -> chat history adapter.',
      age: '2h',
      unread: 1,
      messages: [
        { who: 'System', line: 'Kanban + multi-chat pass active. Next: real Gateway relay wiring.' },
      ],
    },
  ],
  events: [],
  feedFilter: 'All',
  selectedTask: 0,
};

const el = {
  roster: document.getElementById('roster-grid'),
  feed: document.getElementById('feed-list'),
  kanban: document.getElementById('kanban-grid'),
  filters: document.getElementById('feed-filters'),
  codexTasks: document.getElementById('codex-task-list'),
  codexHistory: document.getElementById('codex-history'),
  agents: document.getElementById('agent-count'),
  events: document.getElementById('event-count'),
  pulseActive: document.getElementById('pulse-active'),
  pulseBlocked: document.getElementById('pulse-blocked'),
  pulseGateway: document.getElementById('pulse-gateway'),
  pulseEta: document.getElementById('pulse-eta'),
};

const lanes = ['queued', 'running', 'blocked', 'done'];
const laneTitle = { queued: 'Queued', running: 'Running', blocked: 'Blocked', done: 'Done' };
const filterOptions = ['All', 'Main', 'Ops', 'Research', 'Memory', 'System', 'Errors'];

function modeDot(mode) { return mode === 'active' ? 'active' : mode === 'idle' ? 'idle' : 'stale'; }
function now() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }

function renderFilters() {
  el.filters.innerHTML = filterOptions.map(name =>
    `<button class="filter-chip ${state.feedFilter === name ? 'active' : ''}" data-filter="${name}">${name}</button>`
  ).join('');

  el.filters.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      state.feedFilter = btn.dataset.filter || 'All';
      render();
    });
  });
}

function render() {
  el.roster.innerHTML = state.agents.map(a => `
    <article class="agent-card">
      <div class="agent-head"><div><div class="agent-name">${a.name}</div><div class="agent-role">${a.role}</div></div>
      <div class="agent-role"><span class="dot ${modeDot(a.mode)}"></span>${a.mode}</div></div>
      <div class="agent-last">${a.last}</div>
    </article>`).join('');

  el.kanban.innerHTML = lanes.map(l => {
    const cards = state.tasks.filter(t => t.state === l)
      .map(t => `<article class="card"><div class="card-title">${t.title}</div><div class="meta">${t.owner}</div></article>`).join('');
    return `<section class="lane ${l === 'blocked' ? 'blocked' : ''}"><h3>${laneTitle[l]}</h3>${cards || '<div class="meta">No items</div>'}</section>`;
  }).join('');

  const filteredEvents = state.feedFilter === 'All'
    ? state.events
    : state.feedFilter === 'Errors'
      ? state.events.filter(e => /error|failed|timeout|stale/i.test(e.text))
      : state.events.filter(e => e.agent === state.feedFilter);

  el.feed.innerHTML = filteredEvents.slice(0, 120).map(evt => `
    <article class="feed-item"><div class="meta">${evt.time} • ${evt.agent} • ${evt.stream}</div><div class="text">${evt.text}</div></article>
  `).join('');

  el.codexTasks.innerHTML = state.codexTasks.map((t, i) => `
    <article class="task-row ${state.selectedTask === i ? 'active' : ''}" data-task-index="${i}">
      <div class="task-row-top">
        <div class="task-title">${t.title}</div>
        <span class="task-age">${t.age}</span>
      </div>
      <div class="task-preview">${t.preview}</div>
      <div class="task-meta">
        <span class="muted">thread</span>
        ${t.unread ? `<span class="unread-badge">${t.unread}</span>` : '<span></span>'}
      </div>
    </article>
  `).join('');

  el.codexTasks.querySelectorAll('.task-row').forEach(row => {
    row.addEventListener('click', () => {
      state.selectedTask = Number(row.getAttribute('data-task-index') || 0);
      state.codexTasks[state.selectedTask].unread = 0;
      render();
    });
  });

  const selected = state.codexTasks[state.selectedTask];
  el.codexHistory.innerHTML = selected.messages.slice(-40).map(item => `
    <article class="hist-item ${item.who === 'Main' ? 'user' : ''}">
      <div class="who">${item.who}</div>
      <div class="line">${item.line}</div>
    </article>
  `).join('');

  const blockers = state.tasks.filter(t => t.state === 'blocked').length;
  const activeAgents = state.agents.filter(a => a.mode === 'active').length;

  el.agents.textContent = String(state.agents.length);
  el.events.textContent = String(state.events.length);
  el.pulseActive.textContent = String(activeAgents);
  el.pulseBlocked.textContent = String(blockers);
  el.pulseGateway.textContent = 'stable';
  el.pulseEta.textContent = blockers ? 'resolve blocker first' : '22m';
}

function pushEvent(agent, stream, text) {
  state.events.unshift({ time: now(), agent, stream, text });
  if (state.events.length > 240) state.events.length = 240;

  const targetIdx = state.codexTasks.findIndex(t => t.title.toLowerCase().includes('gateway'));
  const idx = targetIdx >= 0 ? targetIdx : state.selectedTask;
  const thread = state.codexTasks[idx];
  thread.messages.push({ who: agent, line: text });
  if (thread.messages.length > 80) thread.messages.shift();

  if (idx !== state.selectedTask) thread.unread = Math.min((thread.unread || 0) + 1, 99);
  thread.preview = text;

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
}, 2600);

renderFilters();
render();
pushEvent('System', 'note', 'Kanban + multi-chat pass active. Next: real Gateway relay wiring.');