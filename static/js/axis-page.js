// The reference template's scroll-to-top interaction, without unused plugins.
const topButton = document.querySelector('.scroll-to-top');
topButton.addEventListener('click', () => window.scrollTo({top: 0, behavior: 'smooth'}));
window.addEventListener('scroll', () => topButton.classList.toggle('visible', window.scrollY > 300), {passive: true});
