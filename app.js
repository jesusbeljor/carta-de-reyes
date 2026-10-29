const grid = document.querySelector('#gift-grid');
const filters = document.querySelector('#filters');
const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg>';
const sizeIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 16 13-13 5 5L8 21ZM8 11l2 2m2-6 2 2m2-6 2 2"/></svg>';
let gifts = [];
let activeCategory = 'Todo';
let toastTimeout;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function safeUrl(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Enlace no válido');
  return url.href;
}

function externalLink(url, className) {
  const link = element('a', className);
  link.href = safeUrl(url);
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
}

function giftCard(gift, number) {
  const article = element('article', 'gift');
  const imageLink = externalLink(gift.url, 'gift-image-link');
  imageLink.setAttribute('aria-label', `Ver ${gift.nombre}, ${gift.detalle}, en ${gift.tienda} (abre en otra pestaña)`);
  imageLink.append(element('span', 'gift-number', String(number).padStart(2, '0')));
  const image = element('img');
  image.alt = `${gift.nombre} · ${gift.detalle}`;
  image.loading = number <= 3 ? 'eager' : 'lazy';
  image.decoding = 'async';
  image.referrerPolicy = 'no-referrer';
  image.addEventListener('error', () => {
    image.hidden = true;
    const fallback = element('span', 'image-fallback');
    fallback.innerHTML = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 19h32v23H8ZM5 12h38v9H5ZM24 12v30M24 12C9 12 10 1 17 5c4 2 7 7 7 7Zm0 0C39 12 38 1 31 5c-4 2-7 7-7 7Z"/></svg>';
    fallback.append(element('span', '', 'Ver foto en la tienda ↗'));
    imageLink.append(fallback);
  }, { once: true });
  image.src = safeUrl(gift.imagen);
  imageLink.append(image, element('span', 'gift-category', gift.categoria));
  const body = element('div', 'gift-body');
  body.append(element('p', 'gift-brand', gift.marca), element('h3', '', gift.nombre), element('p', 'gift-color', gift.detalle));
  const size = element('div', 'gift-size');
  size.innerHTML = sizeIcon;
  const confirmed = typeof gift.talla === 'string' && gift.talla.trim();
  size.append(element('span', '', gift.requiereTalla ? 'Mi talla:' : 'Talla:'), element('span', confirmed ? 'confirmed' : gift.requiereTalla ? 'pending' : '', confirmed || (gift.requiereTalla ? 'Pendiente' : 'No necesita')));
  const link = externalLink(gift.url, 'store-link');
  link.setAttribute('aria-label', `Ver en ${gift.tienda}: ${gift.nombre}, ${gift.detalle} (abre en otra pestaña)`);
  link.append(element('span', '', `Ver en ${gift.tienda}`));
  link.insertAdjacentHTML('beforeend', arrow);
  body.append(size, link, element('p', 'store-caption', 'La compra se hace en la tienda'));
  article.append(imageLink, body);
  return article;
}

function render() {
  grid.replaceChildren(...gifts.flatMap((gift, index) => activeCategory === 'Todo' || gift.categoria === activeCategory ? [giftCard(gift, index + 1)] : []));
  const count = grid.children.length;
  document.querySelector('#item-count').textContent = `${count} ${count === 1 ? 'idea' : 'ideas'}`;
  filters.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.textContent === activeCategory)));
  document.querySelector('.size-notice').hidden = !gifts.some(gift => gift.requiereTalla && !gift.talla?.trim());
  grid.setAttribute('aria-busy', 'false');
}

async function loadGifts() {
  document.querySelector('#load-error').hidden = true;
  grid.setAttribute('aria-busy', 'true');
  try {
    const response = await fetch('./regalos.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error('No se pudo cargar');
    const data = await response.json();
    if (!Array.isArray(data.regalos)) throw new Error('Formato incorrecto');
    gifts = data.regalos;
    filters.replaceChildren();
    for (const category of ['Todo', ...new Set(gifts.map(gift => gift.categoria))]) {
      const button = element('button', '', category);
      button.type = 'button';
      button.setAttribute('aria-pressed', String(category === activeCategory));
      button.addEventListener('click', () => { activeCategory = category; render(); });
      filters.append(button);
    }
    document.querySelector('#filter-bar').hidden = gifts.length === 0;
    render();
    if (gifts.length === 0) grid.append(element('p', 'loading', 'La carta está en camino. Pronto añadiré mis primeras ideas.'));
  } catch (error) {
    grid.replaceChildren();
    grid.setAttribute('aria-busy', 'false');
    document.querySelector('#load-error').hidden = false;
  }
}

function toast(message) {
  const node = document.querySelector('#toast');
  node.textContent = message;
  node.hidden = false;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { node.hidden = true; }, 3500);
}

const shareDialog = document.querySelector('#share-dialog');
document.querySelector('#share').addEventListener('click', () => {
  const url = new URL(location.href);
  url.hash = '';
  url.search = '';
  const input = document.querySelector('#share-url');
  input.value = url.href;
  document.querySelector('#copy-status').textContent = '';
  shareDialog.showModal();
  input.select();
});
document.querySelector('#close-dialog').addEventListener('click', () => shareDialog.close());
document.querySelector('#copy-link').addEventListener('click', async () => {
  const input = document.querySelector('#share-url');
  try {
    await navigator.clipboard.writeText(input.value);
    shareDialog.close();
    toast('Enlace copiado. ¡Listo para tus Reyes!');
  } catch {
    input.focus(); input.select();
    document.querySelector('#copy-status').textContent = 'Selecciona el enlace y cópialo con el menú de tu dispositivo.';
  }
});
document.querySelector('#retry').addEventListener('click', loadGifts);
loadGifts();
