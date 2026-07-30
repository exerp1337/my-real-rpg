// ===========================
// TAB SWITCHING
// ===========================
const navBtns = document.querySelectorAll('.nav-btn');
const tabContents = document.querySelectorAll('.tab-content');

navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;

    navBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    tabContents.forEach(tab => {
      tab.classList.remove('active');
      if (tab.id === `tab-${target}`) {
        tab.classList.add('active');
        // Плавный скролл к меню
        document.getElementById('menu').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
});

// ===========================
// SIZE PICKER
// ===========================
document.addEventListener('click', e => {
  if (e.target.classList.contains('size-btn')) {
    const picker = e.target.closest('.size-picker');
    if (!picker) return;
    picker.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
  }
});

// ===========================
// HEADER SCROLL SHADOW (Dark Theme)
// ===========================
const header = document.querySelector('.header');
window.addEventListener('scroll', () => {
  if (window.scrollY > 40) {
    header.style.boxShadow = '0 4px 24px rgba(0,0,0,0.6)';
    header.style.borderBottomColor = 'transparent';
  } else {
    header.style.boxShadow = 'none';
    header.style.borderBottomColor = 'var(--border)';
  }
}, { passive: true });
