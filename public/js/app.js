// app.js (browser) - small behaviours. No inline scripts, because the
// Content-Security-Policy only allows scripts loaded from our own files.

// 1. Selects marked data-autosubmit submit their form when changed
document.querySelectorAll('[data-autosubmit]').forEach((el) =>
  el.addEventListener('change', () => el.form.submit()));

// 2. Forms marked data-confirm ask "Are you sure?" first
document.querySelectorAll('form[data-confirm]').forEach((form) =>
  form.addEventListener('submit', (e) => { if (!confirm(form.dataset.confirm)) e.preventDefault(); }));

// 3. Kebab (⋮) menus: open one, close the others
const closeMenus = () => document.querySelectorAll('.menu-list').forEach((m) => {
  m.hidden = true;
  const b = m.parentElement.querySelector('.kebab');
  if (b) b.setAttribute('aria-expanded', 'false');
});
document.querySelectorAll('.kebab').forEach((btn) =>
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const list = btn.parentElement.querySelector('.menu-list');
    const wasHidden = list.hidden;
    closeMenus();
    list.hidden = !wasHidden;
    btn.setAttribute('aria-expanded', String(wasHidden));
  }));
document.addEventListener('click', closeMenus);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenus(); });

// 4. Full-screen button
document.querySelectorAll('[data-fullscreen]').forEach((btn) =>
  btn.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  }));

// 5. Booking form: "Indefinite return" disables the return time
const indefinite = document.getElementById('indefinite');
const due = document.getElementById('due');
if (indefinite && due) {
  const sync = () => { due.disabled = indefinite.checked; };
  indefinite.addEventListener('change', sync);
  sync();
}

// 6. Calendar: click (or press Enter on) a day to fill the form with that date
const startInput = document.getElementById('start');
document.querySelectorAll('.cal-day[data-date]').forEach((cell) => {
  const pick = () => {
    if (!startInput || !due) return;
    startInput.value = cell.dataset.date + 'T09:00';
    due.value = cell.dataset.date + 'T17:00';
    document.getElementById('asset_id').focus();
  };
  cell.addEventListener('click', pick);
  cell.addEventListener('keydown', (e) => { if (e.key === 'Enter') pick(); });
});