/* =========================================================
   main.js — mobile navigation + active link highlighting
   Shared across every page of TasteAI.
   ========================================================= */

(function () {
  const toggle = document.querySelector('.hamburger');
  const links = document.querySelector('.nav-links');

  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const isOpen = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });

    // Close the mobile menu when a link is chosen.
    links.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Mark the current page's nav link so people always know where they are.
  const currentPage = document.body.dataset.page;
  if (currentPage) {
    const activeLink = document.querySelector(`.nav-links a[data-page="${currentPage}"]`);
    if (activeLink) activeLink.setAttribute('aria-current', 'page');
  }
})();
