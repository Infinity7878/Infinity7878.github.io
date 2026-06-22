const fs = require('fs');
const path = require('path');

const statusPath = path.join(process.cwd(), 'status.html');
if (!fs.existsSync(statusPath)) {
  console.error('Could not find status.html. Run this from your GitHub Pages repo root.');
  process.exit(1);
}

let s = fs.readFileSync(statusPath, 'utf8');
const original = s;

function replaceOnce(search, replacement, label) {
  if (!s.includes(search)) {
    console.warn(`Skip ${label}: pattern not found`);
    return false;
  }
  s = s.replace(search, replacement);
  console.log(`Updated ${label}`);
  return true;
}

// 1) Add CSS for stale status warning, if not already present.
if (!s.includes('.stale-note')) {
  replaceOnce(
    '    .status-error { border-color: rgba(237, 66, 69, 0.45); background: rgba(237, 66, 69, 0.09); }\n',
    '    .status-error { border-color: rgba(237, 66, 69, 0.45); background: rgba(237, 66, 69, 0.09); }\n    .stale-note { margin-top: 0.85rem; padding: 0.8rem 1rem; border: 1px solid rgba(237, 66, 69, 0.35); border-radius: 16px; background: rgba(237, 66, 69, 0.08); color: var(--muted); font-weight: 700; }\n',
    'stale warning CSS'
  );
}

// 2) Remove PM2 restarts metric from display if present.
s = s.replace(/\n\s*\['PM2 restarts',\s*metrics\.(?:pm2Restarts|restarts)\s*\|\|\s*'Unknown'\],/g, '');

// 3) Insert stale timeout helpers after relativeTime function.
if (!s.includes('const STATUS_STALE_AFTER_MINUTES')) {
  const marker = `    function renderMetrics(data) {\n`;
  const helpers = `    const STATUS_STALE_AFTER_MINUTES = 10;\n\n    function getStatusAgeMs(data) {\n      const updated = data && data.updatedAt ? new Date(data.updatedAt) : null;\n      if (!updated || Number.isNaN(updated.getTime())) return Number.POSITIVE_INFINITY;\n      return Date.now() - updated.getTime();\n    }\n\n    function isStatusStale(data) {\n      return getStatusAgeMs(data) > STATUS_STALE_AFTER_MINUTES * 60 * 1000;\n    }\n\n    function withOfflineFallback(data, reason) {\n      const now = new Date().toISOString();\n      const previousComponents = Array.isArray(data && data.components) ? data.components : [];\n      const components = previousComponents.length ? previousComponents.map((component) => ({\n        ...component,\n        status: 'outage',\n        message: 'No recent status heartbeat has been received from the Store Bot VPS.'\n      })) : [\n        { name: 'Discord Bot', status: 'outage', message: 'No recent status heartbeat has been received from the Store Bot VPS.' },\n        { name: 'Checkout / Orders', status: 'outage', message: 'Checkout is assumed unavailable until the VPS reports back online.' },\n        { name: 'AutoPay Scanner', status: 'outage', message: 'AutoPay is assumed unavailable until the VPS reports back online.' },\n        { name: 'R2 File Delivery', status: 'outage', message: 'File delivery is assumed unavailable until the VPS reports back online.' },\n        { name: 'Top.gg Vote Rewards', status: 'outage', message: 'Vote rewards are assumed unavailable until the VPS reports back online.' },\n        { name: 'Website', status: 'operational', message: 'This public status page is online, but the VPS heartbeat is stale.' }\n      ];\n\n      return {\n        ...(data || {}),\n        overall: 'outage',\n        status: 'outage',\n        headline: 'Major outage detected',\n        message: reason || 'No recent status update has been received from the Store Bot VPS.',\n        stale: true,\n        staleAfterMinutes: STATUS_STALE_AFTER_MINUTES,\n        checkedAt: now,\n        incident: reason || 'The public status page has not received a fresh VPS heartbeat. Services are marked offline until the next successful update.',\n        components\n      };\n    }\n\n`;
  replaceOnce(marker, helpers + marker, 'stale timeout helpers');
}

// 4) Add a visible stale note in renderStatus after the status message, if not present.
if (!s.includes("document.getElementById('staleNote')")) {
  replaceOnce(
    "      document.getElementById('statusUpdated').textContent = `Last updated: ${timeText(data.updatedAt)}`;\n",
    "      document.getElementById('statusUpdated').textContent = `Last updated: ${timeText(data.updatedAt)}`;\n\n      let staleNote = document.getElementById('staleNote');\n      if (data.stale) {\n        if (!staleNote) {\n          staleNote = document.createElement('div');\n          staleNote.id = 'staleNote';\n          staleNote.className = 'stale-note';\n          document.getElementById('statusOverview').appendChild(staleNote);\n        }\n        staleNote.textContent = `No VPS heartbeat received for more than ${data.staleAfterMinutes || STATUS_STALE_AFTER_MINUTES} minutes. Services are marked offline until the next update.`;\n      } else if (staleNote) {\n        staleNote.remove();\n      }\n",
    'stale status note'
  );
}

// 5) Apply stale check right after JSON load.
if (!s.includes('if (isStatusStale(data)) {')) {
  replaceOnce(
    "        const data = await response.json();\n        renderStatus(data);\n",
    "        const data = await response.json();\n        if (isStatusStale(data)) {\n          const ageMinutes = Math.floor(getStatusAgeMs(data) / 60000);\n          renderStatus(withOfflineFallback(data, `No status update has been received from the Store Bot VPS in ${ageMinutes} minutes.`));\n          return;\n        }\n        renderStatus(data);\n",
    'stale check after status.json fetch'
  );
}

// 6) Treat fetch failure as outage rather than degraded.
s = s.replace(
  "          overall: 'degraded',\n          headline: 'Status temporarily unavailable',\n          message: 'The public status file could not be loaded. Store Bot may still be operating normally.',",
  "          overall: 'outage',\n          headline: 'Major outage detected',\n          message: 'The public status file could not be loaded. Services are marked offline until a fresh status heartbeat is available.',"
);
s = s.replace(
  "            { name: 'Public Status Page', status: 'degraded', message: 'Could not fetch status.json.' },",
  "            { name: 'Public Status Page', status: 'outage', message: 'Could not fetch status.json.' },"
);

if (s === original) {
  console.log('No changes made. The stale timeout patch may already be applied.');
} else {
  fs.writeFileSync(statusPath, s);
  console.log('Patched status.html with stale heartbeat outage fallback.');
}
