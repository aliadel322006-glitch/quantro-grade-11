/* global self, caches, fetch, Request, Response, URL, AbortController, setTimeout, clearTimeout */

"use strict";

const CACHE_VERSION = "unit1-v1";
const CACHE_PREFIX = "quantro-ai";
const STATIC_CACHE = `${CACHE_PREFIX}-static-${CACHE_VERSION}`;
const NAVIGATION_CACHE = `${CACHE_PREFIX}-navigation-${CACHE_VERSION}`;
const LESSON_CACHE = `${CACHE_PREFIX}-lessons-${CACHE_VERSION}`;
const CURRENT_CACHES = new Set([
  STATIC_CACHE,
  NAVIGATION_CACHE,
  LESSON_CACHE,
]);
const PRIVATE_CACHE_MARKERS = ["-navigation-", "-lessons-"];
const NETWORK_TIMEOUT_MS = 5_000;
const MAX_LESSON_URLS_PER_MESSAGE = 100;
const SAFE_PRECACHE_URLS = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-maskable.svg",
];

const FORBIDDEN_SEGMENT = /\/(?:api\/v1\/)?(?:admin|teacher|cms)(?:\/|$)/i;
const FORBIDDEN_API =
  /^\/api\/(?!v1\/(?:lessons?|lesson-versions?)(?:\/|$))/i;
const SENSITIVE_QUERY_KEY =
  /^(?:access_?token|auth|code|email|learner|password|pin|secret|session|token)$/i;
const SAFE_LESSON_PATHS = [
  /^\/(?:en|ar)\/(?:student\/)?(?:learn|lessons?)(?:\/|$)/i,
  /^\/api\/v1\/(?:lessons?|lesson-versions?)(?:\/|$)/i,
  /^\/(?:assets\/lessons|lesson-assets)(?:\/|$)/i,
];

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function hasSensitiveQuery(url) {
  for (const key of url.searchParams.keys()) {
    if (SENSITIVE_QUERY_KEY.test(key)) {
      return true;
    }
  }
  return false;
}

function isForbiddenPath(pathname) {
  return FORBIDDEN_SEGMENT.test(pathname) || FORBIDDEN_API.test(pathname);
}

function isSafeLessonUrl(url) {
  return (
    isSameOrigin(url) &&
    !isForbiddenPath(url.pathname) &&
    !hasSensitiveQuery(url) &&
    SAFE_LESSON_PATHS.some((pattern) => pattern.test(url.pathname))
  );
}

function isSafeNavigationUrl(url) {
  if (!isSameOrigin(url) || isForbiddenPath(url.pathname) || hasSensitiveQuery(url)) {
    return false;
  }

  return (
    /^\/(?:en|ar)\/?$/i.test(url.pathname) ||
    /^\/(?:en|ar)\/(?:student\/)?(?:learn|lessons?)(?:\/|$)/i.test(
      url.pathname,
    )
  );
}

function isSafeStaticRequest(request, url) {
  if (!isSameOrigin(url) || hasSensitiveQuery(url)) {
    return false;
  }

  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/assets/public/") ||
    url.pathname === "/offline.html" ||
    url.pathname === "/icon.svg" ||
    url.pathname === "/icon-maskable.svg" ||
    url.pathname === "/manifest.webmanifest" ||
    /^\/favicon(?:-[^/]*)?\.(?:ico|png|svg)$/i.test(url.pathname) ||
    (request.destination === "font" && url.pathname.startsWith("/_next/"))
  );
}

function responseCanBeCached(response, expectedContentType) {
  if (!response || !response.ok || response.status !== 200 || response.type === "opaque") {
    return false;
  }

  const cacheControl = response.headers.get("cache-control") ?? "";
  const vary = response.headers.get("vary") ?? "";
  const contentType = response.headers.get("content-type") ?? "";

  return (
    !cacheControl.toLowerCase().includes("no-store") &&
    vary.trim() !== "*" &&
    (!expectedContentType || contentType.includes(expectedContentType))
  );
}

async function fetchWithTimeout(request, timeoutMs = NETWORK_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(request, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function cacheFirstStatic(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request, { ignoreSearch: false });
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (responseCanBeCached(response)) {
    await cache.put(request, response.clone());
  }
  return response;
}

function offlineDocument(url) {
  const arabic = url.pathname.startsWith("/ar");
  const language = arabic ? "ar" : "en";
  const direction = arabic ? "rtl" : "ltr";
  const title = arabic ? "أنت غير متصل بالإنترنت" : "You are offline";
  const message = arabic
    ? "نزّل هذا الدرس أولاً لفتحه دون اتصال. سيبقى عملك محفوظًا على هذا الجهاز."
    : "Download this lesson first to open it offline. Your work remains saved on this device.";
  const retry = arabic ? "إعادة المحاولة" : "Try again";

  return new Response(
    `<!doctype html><html lang="${language}" dir="${direction}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{font-family:system-ui,sans-serif;max-width:42rem;margin:15vh auto;padding:1.5rem;line-height:1.6;background:#f7faf8;color:#13251d}main{background:#fff;padding:clamp(1.25rem,4vw,2.5rem);border-radius:1rem;box-shadow:0 1rem 3rem #1232}a{min-height:44px;display:inline-grid;place-items:center;padding:.65rem 1rem;border-radius:.65rem;background:#146c4e;color:#fff;font-weight:700;text-decoration:none}</style><main><h1>${title}</h1><p>${message}</p><a href="">${retry}</a></main></html>`,
    {
      status: 503,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}

async function networkFirstNavigation(request, url) {
  const navigationCache = await caches.open(NAVIGATION_CACHE);

  try {
    const response = await fetchWithTimeout(request);
    const responseUrl = new URL(response.url || request.url);

    if (
      responseCanBeCached(response, "text/html") &&
      isSafeNavigationUrl(responseUrl)
    ) {
      await navigationCache.put(request, response.clone());
    }
    return response;
  } catch {
    const cachedNavigation = await navigationCache.match(request, {
      ignoreSearch: false,
    });
    if (cachedNavigation) {
      return cachedNavigation;
    }

    const lessonCache = await caches.open(LESSON_CACHE);
    const cachedLesson = await lessonCache.match(request, { ignoreSearch: false });
    if (cachedLesson) {
      return cachedLesson;
    }

    const localeHome = url.pathname.startsWith("/ar") ? "/ar" : "/en";
    const cachedHome = await navigationCache.match(localeHome);
    return cachedHome ?? offlineDocument(url);
  }
}

async function downloadedLessonOrNetwork(request) {
  const cache = await caches.open(LESSON_CACHE);
  const cached = await cache.match(request, { ignoreSearch: false });
  if (cached) {
    return cached;
  }

  // A normal visit is not an implicit download. Only CACHE_LESSON_URLS writes
  // API responses and lesson assets into this private cache.
  return fetch(request);
}

async function cacheLessonUrls(rawUrls) {
  const urls = [...new Set(Array.isArray(rawUrls) ? rawUrls : [])].slice(
    0,
    MAX_LESSON_URLS_PER_MESSAGE,
  );
  const cache = await caches.open(LESSON_CACHE);
  const rejected = [];
  let cached = 0;

  for (const rawUrl of urls) {
    try {
      if (typeof rawUrl !== "string" || rawUrl.length > 2_048) {
        rejected.push(String(rawUrl));
        continue;
      }

      const url = new URL(rawUrl, self.location.origin);
      if (!isSafeLessonUrl(url)) {
        rejected.push(rawUrl);
        continue;
      }

      const request = new Request(url.href, {
        method: "GET",
        credentials: "same-origin",
        redirect: "follow",
      });
      const response = await fetch(request);
      const finalUrl = new URL(response.url || url.href);

      if (!isSafeLessonUrl(finalUrl) || !responseCanBeCached(response)) {
        rejected.push(rawUrl);
        continue;
      }

      await cache.put(request, response.clone());
      cached += 1;
    } catch {
      rejected.push(String(rawUrl));
    }
  }

  return { ok: rejected.length === 0, cached, rejected };
}

async function clearPrivateCaches() {
  const names = await caches.keys();
  const privateNames = names.filter(
    (name) =>
      name.startsWith(`${CACHE_PREFIX}-`) &&
      PRIVATE_CACHE_MARKERS.some((marker) => name.includes(marker)),
  );
  await Promise.all(privateNames.map((name) => caches.delete(name)));
  return { ok: true, cached: 0 };
}

function replyToMessage(event, result) {
  if (event.ports?.[0]) {
    event.ports[0].postMessage(result);
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) =>
        Promise.allSettled(
          SAFE_PRECACHE_URLS.map((url) => cache.add(new Request(url))),
        ),
      ),
      self.skipWaiting(),
    ]),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter(
            (name) =>
              name.startsWith(`${CACHE_PREFIX}-`) && !CURRENT_CACHES.has(name),
          )
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Mutations, cross-origin requests, privileged areas, and non-lesson APIs
  // always go directly to the network and can never enter a cache here.
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (!isSameOrigin(url) || isForbiddenPath(url.pathname)) {
    return;
  }

  if (request.mode === "navigate") {
    if (isSafeNavigationUrl(url)) {
      event.respondWith(networkFirstNavigation(request, url));
    }
    return;
  }

  if (isSafeStaticRequest(request, url)) {
    event.respondWith(cacheFirstStatic(request));
    return;
  }

  if (isSafeLessonUrl(url)) {
    event.respondWith(downloadedLessonOrNetwork(request));
  }
});

self.addEventListener("message", (event) => {
  const type = event.data?.type;

  if (type === "CACHE_LESSON_URLS") {
    event.waitUntil(
      cacheLessonUrls(event.data?.urls)
        .then((result) => replyToMessage(event, result))
        .catch(() =>
          replyToMessage(event, {
            ok: false,
            cached: 0,
            error: "Lesson download failed.",
          }),
        ),
    );
  } else if (type === "CLEAR_PRIVATE_CACHES") {
    event.waitUntil(
      clearPrivateCaches()
        .then((result) => replyToMessage(event, result))
        .catch(() =>
          replyToMessage(event, {
            ok: false,
            error: "Private caches could not be cleared.",
          }),
        ),
    );
  }
});
