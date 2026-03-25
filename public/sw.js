const SW_CACHE = "km-sw-state-v1";
const STATE_URL = "/km-sw-state.json";

const MONTH_HE = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני",
                  "יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];

// App sends its state here so SW can read it even when app is closed
self.addEventListener("message", (event) => {
  if (event.data?.type === "KM_STATE") {
    caches.open(SW_CACHE).then(cache => {
      cache.put(STATE_URL, new Response(JSON.stringify(event.data.payload), {
        headers: { "Content-Type": "application/json" }
      }));
    });
  }
});

// Periodic Background Sync — fires ~once a day on Chrome Android (installed PWA)
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "km-monthly-reminder") {
    event.waitUntil(checkAndNotify());
  }
});

// Also check on SW activation (fallback for non-periodic-sync browsers)
self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

async function checkAndNotify() {
  try {
    const cache  = await caches.open(SW_CACHE);
    const resp   = await cache.match(STATE_URL);
    if (!resp) return;

    const state  = await resp.json();
    const now    = new Date();
    const curKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;

    const alreadyEntered   = state.lastEnteredMonth  === curKey;
    const dismissedThisMonth = state.reminderDismissed === curKey;
    const lastNotified     = state.lastNotifiedMonth  === curKey;

    if (alreadyEntered || dismissedThisMonth || lastNotified) return;

    // Update lastNotified so we don't spam
    await cache.put(STATE_URL, new Response(JSON.stringify({...state, lastNotifiedMonth: curKey}), {
      headers: { "Content-Type": "application/json" }
    }));

    await self.registration.showNotification('מד ק"מ 🚗', {
      body: `עדיין לא עדכנת את מד הק"מ לחודש ${MONTH_HE[now.getMonth()]} — כדאי לעדכן לפני שתשכח!`,
      icon: "/icon.svg",
      badge: "/icon.svg",
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
  } catch(e) {}
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
        clients.openWindow("/");
      }
    })
  );
});
