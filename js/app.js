(function () {
  "use strict";

  const STORAGE_KEY = "movieConnect.customActors";
  const IMAGE_CACHE_KEY = "movieConnect.imageCache";
  const WIKI_SUMMARY_BASE = "https://en.wikipedia.org/api/rest_v1/page/summary/";

  const slots = [
    {
      actorEl: document.getElementById("actor-1"),
      photoEl: document.getElementById("photo-1"),
      initialsEl: document.getElementById("initials-1"),
      requestId: 0,
    },
    {
      actorEl: document.getElementById("actor-2"),
      photoEl: document.getElementById("photo-2"),
      initialsEl: document.getElementById("initials-2"),
      requestId: 0,
    },
  ];

  const getActorsBtn = document.getElementById("get-actors");
  const manageBtn = document.getElementById("manage-btn");
  const manageDialog = document.getElementById("manage-dialog");
  const newActorInput = document.getElementById("new-actor-name");
  const addActorBtn = document.getElementById("add-actor-btn");
  const addError = document.getElementById("add-error");
  const actorListEl = document.getElementById("actor-list");
  const actorCountEl = document.getElementById("actor-count");
  const resetBtn = document.getElementById("reset-btn");

  function loadCustomActors() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }

  function saveCustomActors(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (err) {
      // localStorage unavailable (private mode, quota, etc.) - fail silently.
    }
  }

  let customActors = loadCustomActors();

  function allActors() {
    return DEFAULT_ACTORS.concat(customActors);
  }

  function normalize(name) {
    return name.trim().replace(/\s+/g, " ");
  }

  function nameExists(name) {
    const lower = name.toLowerCase();
    return allActors().some((a) => a.toLowerCase() === lower);
  }

  function pickPair() {
    const list = allActors();
    if (list.length === 0) return null;
    if (list.length === 1) return [list[0], list[0]];

    const i = Math.floor(Math.random() * list.length);
    let j = Math.floor(Math.random() * (list.length - 1));
    if (j >= i) j += 1;

    return [list[i], list[j]];
  }

  function loadImageCache() {
    try {
      const raw = localStorage.getItem(IMAGE_CACHE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (err) {
      return {};
    }
  }

  function saveImageCache(cache) {
    try {
      localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(cache));
    } catch (err) {
      // localStorage unavailable - fail silently, just means no caching.
    }
  }

  let imageCache = loadImageCache();

  function getInitials(name) {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return "?";
    const first = words[0][0] || "";
    const last = words.length > 1 ? words[words.length - 1][0] || "" : "";
    return (first + last).toUpperCase();
  }

  async function lookupWikipediaThumbnail(title) {
    const url = WIKI_SUMMARY_BASE + encodeURIComponent(title.replace(/ /g, "_"));
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.type === "disambiguation") return null;
    return (data.thumbnail && data.thumbnail.source) || null;
  }

  // Looks up a small headshot for `name` via Wikipedia's free public API
  // (no key required, CORS-enabled). Results are cached in localStorage so
  // each actor is only ever looked up once per browser; a `null` entry
  // means "looked up, no photo found" and is cached too, to avoid retrying
  // a known miss. Network errors are NOT cached, so they're retried later.
  async function fetchActorImage(name) {
    if (Object.prototype.hasOwnProperty.call(imageCache, name)) {
      return imageCache[name];
    }

    let url = null;
    try {
      url = await lookupWikipediaThumbnail(name);
      if (!url) {
        url = await lookupWikipediaThumbnail(`${name} (actor)`);
      }
    } catch (err) {
      return null;
    }

    imageCache[name] = url;
    saveImageCache(imageCache);
    return url;
  }

  function setSlotName(slot, name) {
    slot.actorEl.textContent = name;
    slot.photoEl.hidden = true;
    slot.photoEl.removeAttribute("src");
    slot.initialsEl.textContent = getInitials(name);
    slot.initialsEl.hidden = false;
  }

  function setSlotEmpty(slot, text) {
    slot.requestId += 1; // invalidate any in-flight photo fetch for this slot
    slot.actorEl.textContent = text;
    slot.photoEl.hidden = true;
    slot.photoEl.removeAttribute("src");
    slot.initialsEl.hidden = true;
    slot.initialsEl.textContent = "";
  }

  function showActorInSlot(slot, name) {
    setSlotName(slot, name);

    const requestId = ++slot.requestId;
    fetchActorImage(name).then((url) => {
      // A newer pair may have been requested while this fetch was in
      // flight - ignore stale results so photos never land in the wrong slot.
      if (slot.requestId !== requestId || !url) return;

      slot.photoEl.onload = () => {
        slot.photoEl.hidden = false;
        slot.initialsEl.hidden = true;
      };
      slot.photoEl.onerror = () => {
        slot.photoEl.hidden = true;
        slot.initialsEl.hidden = false;
      };
      slot.photoEl.alt = name;
      slot.photoEl.src = url;
    });
  }

  function showNewPair() {
    const pair = pickPair();
    if (!pair) {
      setSlotEmpty(slots[0], "Add some actors first");
      setSlotEmpty(slots[1], "");
      return;
    }
    showActorInSlot(slots[0], pair[0]);
    showActorInSlot(slots[1], pair[1]);
  }

  function renderActorList() {
    actorListEl.innerHTML = "";

    const defaultItems = DEFAULT_ACTORS.map((name) => ({ name, custom: false }));
    const customItems = customActors.map((name) => ({ name, custom: true }));
    const items = defaultItems.concat(customItems).sort((a, b) => a.name.localeCompare(b.name));

    actorCountEl.textContent = `${items.length} actor${items.length === 1 ? "" : "s"}`;

    const frag = document.createDocumentFragment();
    items.forEach((item) => {
      const li = document.createElement("li");
      if (item.custom) li.classList.add("custom");

      const nameSpan = document.createElement("span");
      nameSpan.className = "name";
      nameSpan.textContent = item.name;
      li.appendChild(nameSpan);

      if (item.custom) {
        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "remove-btn";
        removeBtn.setAttribute("aria-label", `Remove ${item.name}`);
        removeBtn.textContent = "✕";
        removeBtn.addEventListener("click", () => removeCustomActor(item.name));
        li.appendChild(removeBtn);
      }

      frag.appendChild(li);
    });
    actorListEl.appendChild(frag);
  }

  function addActor() {
    addError.textContent = "";
    const name = normalize(newActorInput.value);

    if (!name) {
      addError.textContent = "Enter a name.";
      return;
    }
    if (name.length > 60) {
      addError.textContent = "That name is too long.";
      return;
    }
    if (nameExists(name)) {
      addError.textContent = `"${name}" is already on the list.`;
      return;
    }

    customActors.push(name);
    saveCustomActors(customActors);
    newActorInput.value = "";
    renderActorList();
  }

  function removeCustomActor(name) {
    customActors = customActors.filter((a) => a !== name);
    saveCustomActors(customActors);
    renderActorList();
  }

  function resetToDefaults() {
    if (!confirm("Remove all actors you've added? This can't be undone.")) return;
    customActors = [];
    saveCustomActors(customActors);
    renderActorList();
  }

  getActorsBtn.addEventListener("click", showNewPair);

  manageBtn.addEventListener("click", () => {
    renderActorList();
    addError.textContent = "";
    newActorInput.value = "";
    manageDialog.showModal();
  });

  addActorBtn.addEventListener("click", addActor);
  newActorInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addActor();
    }
  });

  resetBtn.addEventListener("click", resetToDefaults);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {
        // Offline support is a bonus, not a requirement - ignore failures.
      });
    });
  }
})();
