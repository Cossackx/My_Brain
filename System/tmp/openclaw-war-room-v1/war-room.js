const state = {
  agents: [
    { id: 'main', name: 'Main', role: 'Coordinator', mode: 'active', last: 'processing session events' },
    { id: 'research', name: 'Research', role: 'Signal Analyst', mode: 'idle', last: 'waiting for trigger' },
    { id: 'ops', name: 'Ops', role: 'Runtime Operator', mode: 'active', last: 'watching gateway health' },
    { id: 'memory', name: 'Memory', role: 'Context Curator', mode: 'idle', last: 'digest scheduled' },
  ],
  missions: [
    { title: 'War Room v1 visual pass', state: 'running', owner: 'Main' },
    { title: 'X intel extraction skill', state: 'succeeded', owner: 'Ops' },
    { title: 'Relay adapter design', state: 'queued', owner: 'Research' },
  ],
  events: [],
};

const el = {
  roster: document.getElementById('roster-grid'),
  feed: document.getElementById('feed-list'),
  missions: document.getElementById('mission-list'),
  agents: document.getElementById('agent-count'),
  events: document.getElementById('event-count'),
  conn: document.getElementById('conn-pill'),
};

function modeDot(mode) {
  return mode === 'active' ? 'active' : mode === 'idle' ? 'idle' : 'stale';
}

function render() {
  el.roster.innerHTML = state.agents
    .map(
      (a) => `
      <article class="agent-card">
        <div class="agent-head">
          <div>
            <div class="agent-name">${a.name}</div>
            <div class="agent-role">${a.role}</div>
          </div>
          <div class="agent-role"><span class="dot ${modeDot(a.mode)}"></span>${a.mode}</div>
        </div>
        <div class="agent-role" style="margin-top:8px">${a.last}</div>
      </article>
    `,
    )
    .join('');

  el.feed.innerHTML = state.events
    .slice(0, 80)
    .map(
      (evt) => `
      <article class="feed-item">
        <div class="meta">${evt.time} • ${evt.agent} • ${evt.stream}</div>
        <div class="text">${evt.text}</div>
      </article>
    `,
    )
    .join('');

  el.missions.innerHTML = state.missions
    .map(
      (m) => `<article class="mission-item"><div><strong>${m.title}</strong></div><div class="state">${m.owner} • ${m.state}</div></article>`,
    )
    .join('');

  el.agents.textContent = String(state.agents.length);
  el.events.textContent = String(state.events.length);
}

function now() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function pushEvent(agent, stream, text) {
  state.events.unshift({ time: now(), agent, stream, text });
  if (state.events.length > 200) state.events.length = 200;
  render();
}

function startDemoTicker() {
  const samples = [
    ['Main', 'lifecycle', 'run started for session agent:main:main'],
    ['Ops', 'tool', 'gateway status check completed'],
    ['Research', 'assistant', 'summarized 3 source signals for planning'],
    ['Memory', 'lifecycle', 'digest candidate queued for review'],
  ];
  setInterval(() => {
    const [agent, stream, text] = samples[Math.floor(Math.random() * samples.length)];
    pushEvent(agent, stream, text);
  }, 2400);
}

render();
pushEvent('System', 'note', 'Demo mode enabled. Connect relay in v2 for real-time Gateway events.');
startDemoTicker();
