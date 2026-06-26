const STATIC_CACHE = 'ozon-static-v6';
const IMAGE_CACHE = 'ozon-images-v6';
const DATA_CACHE = 'ozon-data-v6';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/cart-shared-worker.js',
];

// При установке кэшируем всё, что нужно для запуска офлайн после одного онлайн-захода:
// 1) базовый app-shell, 2) хешированные бандлы JS/CSS из asset-manifest.json,
// 3) данные каталога и картинки товаров.
async function precache() {
  const staticCache = await caches.open(STATIC_CACHE);
  await staticCache.addAll(STATIC_ASSETS);

  // Имена бандлов (main.<hash>.js/css) меняются при каждой сборке — берём их из манифеста.
  try {
    const manifestResponse = await fetch('/asset-manifest.json');

    if (manifestResponse.ok) {
      const manifest = await manifestResponse.json();
      const entrypoints = (manifest.entrypoints || []).map((path) => `/${path}`);
      await staticCache.addAll(entrypoints);
    }
  } catch {
    // нет сети на установке — не критично, докэшируется при работе
  }

  // Данные каталога + картинки товаров, чтобы каталог открывался офлайн целиком.
  try {
    const dataCache = await caches.open(DATA_CACHE);
    const productsResponse = await fetch('/api/products.json');

    if (productsResponse.ok) {
      await dataCache.put('/api/products.json', productsResponse.clone());

      const products = await productsResponse.json();
      const imageCache = await caches.open(IMAGE_CACHE);
      const links = products.map((item) => item.link).filter(Boolean);

      await Promise.all(links.map((link) => imageCache.add(link).catch(() => null)));
    }
  } catch {
    // данные докэшируются стратегиями ниже при первом онлайн-обращении
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  const keep = [STATIC_CACHE, IMAGE_CACHE, DATA_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => !keep.includes(name))
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isImage(request) {
  if (request.destination === 'image') {
    return true;
  }

  return /\.(png|jpe?g|gif|svg|webp|ico)$/i.test(new URL(request.url).pathname);
}

// Ответ с флагом redirected нельзя отдать на навигационный запрос —
// браузер кидает ошибку. Пересобираем «чистый» Response без редиректа.
async function cleanResponse(response) {
  if (!response || !response.redirected) {
    return response;
  }

  const body = await response.blob();

  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

// Cache First — для статических ассетов (HTML/CSS/JS, бандлы CRA)
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);

    if (response && response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }

    return response;
  } catch {
    return Response.error();
  }
}

// Network First — для навигации и данных (список товаров)
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const isNavigation = request.mode === 'navigate';

  try {
    const response = await fetch(request);

    if (response && response.ok) {
      cache.put(request, response.clone());
    }

    return isNavigation ? cleanResponse(response) : response;
  } catch {
    const cached = await cache.match(request);

    if (cached) {
      return isNavigation ? cleanResponse(cached) : cached;
    }

    if (isNavigation) {
      const fallback =
        (await caches.match('/index.html')) || (await caches.match('/'));

      if (fallback) {
        return cleanResponse(fallback);
      }
    }

    return Response.error();
  }
}

// Stale While Revalidate — для изображений
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }

      return response;
    })
    .catch(() => null);

  return cached || (await network) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Обрабатываем только свой origin
  if (url.origin !== self.location.origin) {
    return;
  }

  // Не вмешиваемся в служебные запросы dev-сервера (hot reload)
  if (
    url.pathname.includes('hot-update') ||
    url.pathname.startsWith('/ws') ||
    url.pathname.startsWith('/sockjs-node')
  ) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, STATIC_CACHE));
    return;
  }

  if (isImage(request)) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
    return;
  }

  // API / данные (список товаров)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }

  // Прочая статика
  event.respondWith(cacheFirst(request, STATIC_CACHE));
});
