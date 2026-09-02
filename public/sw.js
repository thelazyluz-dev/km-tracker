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
