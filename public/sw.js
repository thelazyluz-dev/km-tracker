const SW_CACHE  = "km-sw-state-v2";
const STATE_URL = "/km-sw-state.json";

// Nag on these days of the month, then stop. Entering the reading late means
// the first days of the new month get charged to the month that just ended,
// so earlier is more accurate — but three prompts is enough.
const NAG_DAYS = [1, 3, 6];

const readState  = async () => {
  const c = await caches.open(SW_CACHE);
  const r = await c.match(STATE_URL);
  return r ? r.json() : null;
};
const writeState = async (s) => {
  const c = await caches.open(SW_CACHE);
  await c.put(STATE_URL, new Response(JSON.stringify(s), {
    headers: { "Content-Type": "application/json" }
  }));
};

// The app owns the "what" (which month is missing); the SW owns the "when".
// It merges so the app can't clobber the SW's own record of what it has sent.
self.addEventListener("message", (event) => {
  if (event.data?.type !== "KM_STATE") return;
  event.waitUntil((async () => {
    const prev = (await readState()) || {};
    await writeState({ ...prev, ...event.data.payload });
  })());
});

// Periodic Background Sync — Chrome on Android, installed PWA only.
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "km-monthly-reminder") event.waitUntil(checkAndNotify());
});

self.addEventListener("activate", (event) => event.waitUntil(clients.claim()));

// ── App shell ────────────────────────────────────────────────────────────
// Chrome will not fire beforeinstallprompt for a worker with no fetch
// handler, so without this the install prompt never appears at all. It also
// makes the app work offline, which for a tracker you open once a month in a
// car park is the point.
const SHELL = "km-shell-v1";

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Writes must be kept alive with waitUntil — without it the worker can be
  // shut down mid-put and the asset silently never lands in the cache.
  const save = (cache, request, res) => {
    if (res && res.ok) event.waitUntil(cache.put(request, res.clone()));
    return res;
  };

  // Navigations: fresh when online, cached when not.
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(SHELL);
      try {
        return save(cache, req, await fetch(req));
      } catch {
        return (await cache.match(req))
            || (await cache.match(self.registration.scope))
            || Response.error();
      }
    })());
    return;
  }

  // Hashed assets never change under the same URL — serve them from cache and
  // refresh in the background.
  event.respondWith((async () => {
    const cache = await caches.open(SHELL);
    const hit = await cache.match(req);
    if (hit) {
      event.waitUntil((async () => {
        try { const r = await fetch(req); if (r && r.ok) await cache.put(req, r.clone()); } catch {}
      })());
      return hit;
    }
    try {
      return save(cache, req, await fetch(req));
    } catch {
      return Response.error();
    }
  })());
});

async function checkAndNotify() {
  try {
    const state = await readState();
    if (!state?.pendingMonth) return;               // nothing to enter

    const now = new Date();
    if (!NAG_DAYS.includes(now.getDate())) return;  // not a nag day

    if (state.reminderDismissed === state.pendingMonth) return;

    // One notification per (month, nag day) — survives the app resyncing.
    const stamp = `${state.pendingMonth}#${now.getDate()}`;
    if (state.lastNotifiedStamp === stamp) return;
    await writeState({ ...state, lastNotifiedStamp: stamp });

    const name = state.pendingMonthName || "החודש שהסתיים";
    await self.registration.showNotification("8-400 🚗", {
      body: `הזן את מד הק״מ של ${name} — ככל שמעדכנים מוקדם יותר, החישוב מדויק יותר.`,
      icon:  self.registration.scope + "icon.svg",
      badge: self.registration.scope + "icon.svg",
      tag: "km-reminder",
      renotify: false,
      requireInteraction: false,
      dir: "rtl",
      lang: "he",
      actions: [
        { action: "open",    title: "עדכן עכשיו" },
        { action: "dismiss", title: "אחר כך"    }
      ]
    });
  } catch (e) {}
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      if (list.length > 0) {
        list[0].focus();
        list[0].postMessage({ type: "OPEN_UPDATE_TAB" });
      } else {
        clients.openWindow(self.registration.scope);
      }
    })
  );
});
