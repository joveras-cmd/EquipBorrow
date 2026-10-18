// helpers.js - small formatting functions used by routes AND views.

const STATUS_LABEL = {
  in_approval: 'In-approval', approved: 'Approved', declined: 'Declined',
  checked_out: 'Checked out', returned: 'Returned', cancelled: 'Cancelled'
};
const statusLabel = (s) => STATUS_LABEL[s] || s;

const pad = (n) => String(n).padStart(2, '0');

// Date -> "2026-10-18" (local time, used in URLs and the calendar)
const ymd = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
};

// Date -> "Jun 24, 2025 1:42 PM"  (same look as the screenshot)
const fmtDateTime = (d) => {
  if (!d) return 'Indefinite';
  const x = new Date(d);
  return x.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
         ' ' + x.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

// Date -> "1:42 PM"
const fmtTime = (d) =>
  new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

// Date -> "2026-10-18T13:42"  (value format of <input type="datetime-local">)
const toInputValue = (d) => {
  const x = new Date(d);
  return `${ymd(x)}T${pad(x.getHours())}:${pad(x.getMinutes())}`;
};

// "2026-10-18T13:42" -> "2026-10-18 13:42:00" (MySQL DATETIME). Returns null if invalid.
const DT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const toSqlDateTime = (v) => (DT_RE.test(v) && !isNaN(new Date(v)) ? v.replace('T', ' ') + ':00' : null);

module.exports = { statusLabel, ymd, fmtDateTime, fmtTime, toInputValue, toSqlDateTime };