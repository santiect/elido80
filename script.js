const chapterTitles = [
  'Chegada e recepção',
  'Encontros de família',
  'Parabéns ao Elido',
  'Brinde e celebração'
];

const photos = Array.isArray(PHOTOS) ? PHOTOS : [];
const totalPhotos = photos.length;
const chaptersRoot = document.getElementById('chapters');
const countElement = document.getElementById('photoCount');
const highlightStrip = document.getElementById('highlightStrip');
const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightboxImage');
const lightboxCaption = document.getElementById('lightboxCaption');
const closeLightbox = document.getElementById('closeLightbox');
const prevPhoto = document.getElementById('prevPhoto');
const nextPhoto = document.getElementById('nextPhoto');
const intro = document.getElementById('intro');
const introCollage = document.getElementById('introCollage');
const introProgressFill = document.getElementById('introProgressFill');
const introProgressText = document.getElementById('introProgressText');

let currentIndex = 0;

countElement.textContent = totalPhotos.toLocaleString('pt-BR');

function getThumbPath(fullPath) {
  if (fullPath.startsWith('publish_images/full/')) {
    return fullPath.replace(/^publish_images\/full\//, 'publish_images/thumbs/');
  }
  if (fullPath.startsWith('editadas/')) {
    return fullPath.replace(/^editadas\//, 'fotos/');
  }
  return fullPath;
}

function getIntroPicks() {
  if (!totalPhotos) {
    return [];
  }

  const picks = [];
  const slots = Math.min(9, totalPhotos);
  const step = (totalPhotos - 1) / Math.max(1, slots - 1);
  for (let i = 0; i < slots; i += 1) {
    picks.push(Math.round(i * step));
  }
  return [...new Set(picks)];
}

function preloadImage(url, timeoutMs = 12000) {
  return new Promise((resolve) => {
    const img = new Image();
    let done = false;

    const finish = (ok) => {
      if (done) {
        return;
      }
      done = true;
      clearTimeout(timer);
      resolve(ok);
    };

    img.onload = () => finish(true);
    img.onerror = () => finish(false);

    const timer = setTimeout(() => finish(false), timeoutMs);
    img.src = url;
  });
}

async function preloadThumbnails(urls, onProgress, concurrency = 10) {
  const total = urls.length;
  let cursor = 0;
  let done = 0;

  async function worker() {
    while (cursor < total) {
      const current = cursor;
      cursor += 1;
      await preloadImage(urls[current]);
      done += 1;
      onProgress(done, total);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, total) }, () => worker());
  await Promise.all(workers);
}

function setPreloadProgress(done, total) {
  if (!introProgressFill || !introProgressText || !total) {
    return;
  }

  const percent = Math.round((done / total) * 100);
  introProgressFill.style.width = `${percent}%`;
  introProgressText.textContent = `${percent}% (${done}/${total})`;
}

async function startIntroAnimation() {
  if (!intro || !introCollage || !totalPhotos) {
    document.body.classList.add('page-ready');
    return;
  }

  document.body.classList.add('intro-active');
  const thumbsToPreload = photos.map(getThumbPath);
  setPreloadProgress(0, thumbsToPreload.length);
  await preloadThumbnails(thumbsToPreload, setPreloadProgress, 10);
  intro.classList.add('intro-ready');

  const picks = getIntroPicks();

  picks.forEach((index, order) => {
    const img = document.createElement('img');
    img.src = getThumbPath(photos[index]);
    img.alt = '';
    img.loading = 'eager';
    img.decoding = 'async';
    img.style.animationDelay = `${order * 320}ms`;
    introCollage.appendChild(img);
  });

  setTimeout(() => {
    intro.classList.add('intro-hide');
    document.body.classList.remove('intro-active');
    document.body.classList.add('page-ready');
  }, 7600);
}

function setupRevealAnimations() {
  const cards = document.querySelectorAll('.gallery-item');
  if (!cards.length) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.08 }
  );

  cards.forEach((card) => observer.observe(card));
}

function buttonForPhoto(src, index, className = 'gallery-item') {
  const button = document.createElement('button');
  button.className = className;
  button.type = 'button';
  button.dataset.index = String(index);

  const img = document.createElement('img');
  const thumbSrc = getThumbPath(src);
  img.src = thumbSrc;
  img.alt = `Foto ${index + 1} do aniversário de 80 anos do Elido`;
  img.loading = 'lazy';
  img.decoding = 'async';
  img.fetchPriority = 'low';
  img.addEventListener('error', () => {
    if (img.src !== src) {
      img.src = src;
    }
  });

  button.appendChild(img);
  button.addEventListener('click', () => openLightbox(index));
  return button;
}

function renderHighlights() {
  const picks = [0, 1, 2, 3, 4, 5, 6, 7].filter((i) => i < totalPhotos);
  picks.forEach((index) => {
    highlightStrip.appendChild(buttonForPhoto(photos[index], index, 'highlight-card'));
  });
}

function renderChapters() {
  if (!totalPhotos) {
    chaptersRoot.innerHTML = '<p>Nenhuma foto encontrada na pasta editadas.</p>';
    return;
  }

  const chunkSize = Math.ceil(totalPhotos / chapterTitles.length);

  chapterTitles.forEach((title, chapterIndex) => {
    const start = chapterIndex * chunkSize;
    const end = Math.min(start + chunkSize, totalPhotos);
    const chapterPhotos = photos.slice(start, end);

    if (!chapterPhotos.length) {
      return;
    }

    const section = document.createElement('section');
    section.className = 'chapter';

    const heading = document.createElement('h3');
    heading.textContent = title;

    const masonry = document.createElement('div');
    masonry.className = 'masonry';

    chapterPhotos.forEach((src, offset) => {
      const index = start + offset;
      masonry.appendChild(buttonForPhoto(src, index));
    });

    section.append(heading, masonry);
    chaptersRoot.appendChild(section);
  });
}

function openLightbox(index) {
  currentIndex = index;
  const source = photos[currentIndex];
  lightboxImage.src = source;
  lightboxCaption.textContent = `Foto ${currentIndex + 1} de ${totalPhotos}`;
  if (!lightbox.open) {
    lightbox.showModal();
  }
}

function movePhoto(step) {
  if (!totalPhotos) {
    return;
  }

  currentIndex = (currentIndex + step + totalPhotos) % totalPhotos;
  openLightbox(currentIndex);
}

closeLightbox.addEventListener('click', () => lightbox.close());
prevPhoto.addEventListener('click', () => movePhoto(-1));
nextPhoto.addEventListener('click', () => movePhoto(1));

document.addEventListener('keydown', (event) => {
  if (!lightbox.open) {
    return;
  }

  if (event.key === 'Escape') {
    lightbox.close();
  }
  if (event.key === 'ArrowLeft') {
    movePhoto(-1);
  }
  if (event.key === 'ArrowRight') {
    movePhoto(1);
  }
});

renderHighlights();
renderChapters();
setupRevealAnimations();
startIntroAnimation();

