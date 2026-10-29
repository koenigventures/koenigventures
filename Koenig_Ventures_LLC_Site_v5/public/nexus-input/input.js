'use strict';

const el = id => document.getElementById(id);
let accessCode = '', database = null, lastRun = null;

function message(id, text) {
  el(id).textContent = text;
}

async function api(body) {
  const res = await fetch('/.netlify/functions/nexus-data', {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: 'Bearer ' + accessCode,
      ...(body ? {'Content-Type': 'application/json'} : {})
    },
    ...(body ? {body: JSON.stringify(body)} : {})
  });

  let data;
  try {
    data = await res.json();
  } catch {
    throw Error('The private server is unavailable. Ask Ann to complete the Netlify setup.');
  }

  if (!res.ok) throw Error(data.error || 'Operation failed.');
  return data;
}

function download(data, name) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'})
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function renderDB() {
  message(
    'history-count',
    `${database.closes.length} closing dates; ${database.snapshots.length} current snapshots. Snapshots do not enter closing percentiles.`
  );

  el('history-table').replaceChildren();

  for (const r of database.closes.slice(-30).reverse()) {
    const tr = document.createElement('tr');
    for (const v of [
      r.date,
      r.vix,
      r.vvix,
      r.prices?.SPX ?? '—',
      r.prices?.SPY ?? '—',
      r.revision
    ]) {
      const td = document.createElement('td');
      td.textContent = v;
      tr.append(td);
    }
    el('history-table').append(tr);
  }

  el('audit').replaceChildren();
  for (const r of database.audit.slice(-15).reverse()) {
    const li = document.createElement('li');
    li.textContent = `${r.at} · ${r.action} · ${r.date || r.count + ' rows'}${r.reason ? ' · ' + r.reason : ''}`;
    el('audit').append(li);
  }
}

async function reload() {
  database = await api();
  renderDB();
}

async function task(button, status, fn) {
  button.disabled = true;
  try {
    await fn();
  } catch (e) {
    message(status, e.message);
  } finally {
    button.disabled = false;
  }
}

el('unlock').addEventListener('submit', e => {
  e.preventDefault();
  task(e.submitter, 'connection', async () => {
    accessCode = el('access').value;
    el('access').value = '';
    await reload();
    el('workspace').hidden = false;
    message('connection', 'Unlocked. Records loaded from the private database.');
  });
});

el('lock').addEventListener('click', () => {
  accessCode = '';
  database = null;
  lastRun = null;
  el('workspace').hidden = true;
  el('results').replaceChildren();
  sessionStorage.removeItem('nexus-current-run');
  sessionStorage.removeItem('nexus-history-rows');
  message('connection', 'Locked.');
});

function currentInput() {
  const time = el('observed-at').value;
  return {
    vix: el('current-vix').value === '' ? null : Number(el('current-vix').value),
    vvix: el('current-vvix').value === '' ? null : Number(el('current-vvix').value),
    observedAt: time ? new Date(time).toISOString() : null,
    geo: Number(el('current-geo').value),
    source: el('snapshot-source').value
  };
}

el('close-form').addEventListener('submit', e => {
  e.preventDefault();
  task(e.submitter, 'close-status', async () => {
    const date = el('close-date').value;
    const prior = database.closes.find(r => r.date === date);
    await api({
      action: 'close',
      date,
      vix: Number(el('close-vix').value),
      vvix: Number(el('close-vvix').value),
      source: el('close-source').value,
      correct: el('correct').checked,
      expectedRevision: prior?.revision,
      reason: el('correction-reason').value
    });
    message('close-status', 'Daily close saved to the database.');
    await reload();
  });
});

el('close-date').addEventListener('change', () => {
  const row = database?.closes.find(r => r.date === el('close-date').value);
  if (row) {
    el('close-vix').value = row.vix;
    el('close-vvix').value = row.vvix;
    message(
      'close-status',
      'A closing record exists. Select correction and add a reason to change it.'
    );
  } else {
    message('close-status', 'New closing date.');
  }
});

el('attach-price').addEventListener('click', e =>
  task(e.target, 'close-status', async () => {
    await api({action: 'attach-price', date: el('close-date').value});
    message('close-status', 'Massive SPY closing price attached.');
    await reload();
  })
);

el('snapshot-form').addEventListener('submit', e => {
  e.preventDefault();
  task(e.submitter, 'snapshot-status', async () => {
    await api({action: 'snapshot', ...currentInput()});
    message(
      'snapshot-status',
      'Current snapshot saved separately from closing history.'
    );
    await reload();
  });
});

el('run').addEventListener('click', e =>
  task(e.target, 'run-status', async () => {
    lastRun = null;
    el('results').replaceChildren();
    message('run-status', 'Reading Massive SPY and calculating…');

    lastRun = await api({action: 'run', ...currentInput()});

    message(
      'run-status',
      `${lastRun.mode}\nVIX/VVIX time: ${lastRun.observedAt}\nSPY bar date: ${lastRun.priceAsOf}; provider status: ${lastRun.priceStatus}\n${lastRun.note}\n${lastRun.historyNote}`
    );

    for (const [key, r] of Object.entries(lastRun.models)) {
      const card = document.createElement('article');
      const h = document.createElement('h3');
      const p = document.createElement('p');

      h.textContent = {
        v74: 'Garlic V7.4 engine',
        v74surface: 'Garlic V7.4 risk surface',
        v76: 'Garlic V7.6',
        v70: 'Garlic V7.0',
        v71: 'Garlic V7.1'
      }[key];

      p.textContent = r.valid
        ? `${r.signal}; score ${r.intensity ?? r.score}/100. ${r.explanation || r.action || ''}`
        : 'Output withheld.';

      card.append(h, p);

      if (
        r.valid &&
        r.surfaceScore != null &&
        typeof r.surfaceLevel === 'string'
      ) {
        const detail = document.createElement('p');
        detail.textContent = `Risk surface: ${r.surfaceScore}/34 · ${r.surfaceLevel}. This is separate from the hedge score.`;
        card.append(detail);
      }

      el('results').append(card);
    }

    if (lastRun.closingPercentiles) {
      const c = lastRun.closingPercentiles;
      message(
        'run-status',
        el('run-status').textContent +
          `\nClosing history (${c.observations} dates): VIX percentile ${c.vix.toFixed(1)}%; VVIX percentile ${c.vvix.toFixed(1)}%.`
      );
    }
  })
);

el('import').addEventListener('click', e =>
  task(e.target, 'import-status', async () => {
    const f = el('import-file').files[0];
    if (!f) throw Error('Choose the private history JSON or CSV.');
    if (f.size > 1000000) throw Error('CSV is too large.');

    const text = await f.text();
    const rows = f.name.toLowerCase().endsWith('.json')
      ? JSON.parse(text)
      : GarlicHistory.parseCSV(text);

    const result = await api({action: 'import', rows});
    message(
      'import-status',
      `Imported ${result.imported} historical dates. Existing dates were not overwritten.`
    );
    await reload();
  })
);

el('export-db').addEventListener('click', e =>
  task(e.target, 'import-status', async () => {
    await reload();
    download(database, 'nexus-private-database-backup.json');
  })
);

el('export-run').addEventListener('click', () => {
  if (lastRun) {
    download(lastRun, 'nexus-current-model-run.json');
  } else {
    message('run-status', 'Run the models first.');
  }
});

el('reload').addEventListener('click', e =>
  task(e.target, 'import-status', reload)
);

el('open-analysis').addEventListener('click', () => {
  if (!lastRun) {
    message('run-status', 'Run the models first.');
    return;
  }

  sessionStorage.setItem('nexus-current-run', JSON.stringify(lastRun));
  sessionStorage.setItem(
    'nexus-history-rows',
    JSON.stringify(
      database.closes
        .filter(r => r.prices?.SPX > 0)
        .map(r => ({
          date: r.date,
          vix: r.vix,
          vvix: r.vvix,
          spx: r.prices.SPX
        }))
    )
  );

  location.href = '../garlic-demo/index.html';
});

el('observed-at').value = '';
el('time-zone').textContent =
  'Device time zone: ' + Intl.DateTimeFormat().resolvedOptions().timeZone;

el('close-date').value = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).format(new Date());

for (const id of [
  'current-vix',
  'current-vvix',
  'observed-at',
  'current-geo'
]) {
  el(id).addEventListener('input', () => {
    lastRun = null;
    el('results').replaceChildren();
    message('run-status', 'Inputs changed. Run the models again.');
  });
}
