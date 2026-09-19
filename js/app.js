(function () {
  "use strict";

  const STORAGE_KEY = "movieConnect.customActors";
  const IMAGE_CACHE_KEY = "movieConnect.imageCache";
  const WIKI_SUMMARY_BASE = "https://en.wikipedia.org/api/rest_v1/page/summary/";

  const slots = [
    {
      rootEl: document.getElementById("slot-el-1"),
      avatarEl: document.getElementById("avatar-1"),
      actorEl: document.getElementById("actor-1"),
      photoEl: document.getElementById("photo-1"),
      initialsEl: document.getElementById("initials-1"),
      requestId: 0,
    },
    {
      rootEl: document.getElementById("slot-el-2"),
      avatarEl: document.getElementById("avatar-2"),
      actorEl: document.getElementById("actor-2"),
      photoEl: document.getElementById("photo-2"),
      initialsEl: document.getElementById("initials-2"),
      requestId: 0,
    },
  ];

  const LOADING_ANIMATION_PATH = "assets/movie-loading.json";
  const LOADING_ANIMATION_SPEED = 4; // plays the 4s source clip at 1s per direction (2s round trip)

  const getActorsBtn = document.getElementById("get-actors");
  const vsBadge = document.getElementById("vs-badge");
  const loadingOverlay = document.getElementById("loading-overlay");
  const lottieBox = document.getElementById("lottie-box");
  const manageBtn = document.getElementById("manage-btn");
  const manageDialog = document.getElementById("manage-dialog");
  const manageForm = document.getElementById("manage-form");
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

  // Restarts a CSS animation on `el` by toggling `className` off and back on
  // across a forced reflow (animations don't replay just by re-adding a
  // class that's already present).
  function replayAnimation(el, className) {
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
  }

  function burstSparks(originEl) {
    const count = 10;
    for (let i = 0; i < count; i++) {
      const spark = document.createElement("span");
      spark.className = "spark";
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const distance = 28 + Math.random() * 22;
      spark.style.setProperty("--spark-x", `${Math.cos(angle) * distance}px`);
      spark.style.setProperty("--spark-y", `${Math.sin(angle) * distance}px`);
      spark.style.background = i % 2 === 0 ? "var(--neon-gold)" : "var(--neon-cyan)";
      originEl.appendChild(spark);
      spark.addEventListener("animationend", () => spark.remove());
    }
  }

  function addRippleEffect(button) {
    button.addEventListener("click", (e) => {
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.4;
      const ripple = document.createElement("span");
      ripple.className = "ripple";
      ripple.style.width = ripple.style.height = `${size}px`;
      const x = e.clientX ? e.clientX - rect.left : rect.width / 2;
      const y = e.clientY ? e.clientY - rect.top : rect.height / 2;
      ripple.style.left = `${x - size / 2}px`;
      ripple.style.top = `${y - size / 2}px`;
      button.appendChild(ripple);
      ripple.addEventListener("animationend", () => ripple.remove());
    });
  }

  function setSlotName(slot, name) {
    slot.avatarEl.classList.remove("loading");
    slot.actorEl.textContent = name;
    slot.photoEl.hidden = true;
    slot.photoEl.removeAttribute("src");
    slot.initialsEl.textContent = getInitials(name);
    slot.initialsEl.hidden = false;
  }

  function setSlotEmpty(slot, text) {
    slot.requestId += 1; // invalidate any in-flight photo fetch for this slot
    slot.avatarEl.classList.remove("loading");
    slot.actorEl.textContent = text;
    slot.photoEl.hidden = true;
    slot.photoEl.removeAttribute("src");
    slot.initialsEl.hidden = true;
    slot.initialsEl.textContent = "";
  }

  function showActorInSlot(slot, name) {
    setSlotName(slot, name);
    replayAnimation(slot.rootEl, "reveal");
    slot.avatarEl.classList.add("loading");

    const requestId = ++slot.requestId;
    fetchActorImage(name).then((url) => {
      // A newer pair may have been requested while this fetch was in
      // flight - ignore stale results so photos never land in the wrong slot.
      if (slot.requestId !== requestId) return;

      if (!url) {
        slot.avatarEl.classList.remove("loading");
        return;
      }

      slot.photoEl.onload = () => {
        slot.photoEl.hidden = false;
        slot.initialsEl.hidden = true;
        slot.avatarEl.classList.remove("loading");
      };
      slot.photoEl.onerror = () => {
        slot.photoEl.hidden = true;
        slot.initialsEl.hidden = false;
        slot.avatarEl.classList.remove("loading");
      };
      slot.photoEl.alt = name;
      slot.photoEl.src = url;
    });
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let lottieAnim = null;

  function getLottieAnim() {
    if (lottieAnim || typeof window.lottie === "undefined") return lottieAnim;
    lottieAnim = window.lottie.loadAnimation({
      container: lottieBox,
      renderer: "svg",
      loop: false,
      autoplay: false,
      path: LOADING_ANIMATION_PATH,
    });
    lottieAnim.setSpeed(LOADING_ANIMATION_SPEED);
    return lottieAnim;
  }

  function waitForComplete(anim) {
    return new Promise((resolve) => {
      function onComplete() {
        anim.removeEventListener("complete", onComplete);
        resolve();
      }
      anim.addEventListener("complete", onComplete);
    });
  }

  // Shows the Lottie clip over the card as a loading bumper: plays forward,
  // then plays the same clip in reverse back to frame 0, then hides again.
  // Restarting the same anim instance mid-flight (e.g. from overlapping
  // calls) leaves it in a state where the reverse phase's "complete" event
  // never fires, so overlap is prevented at the call site instead (the
  // "New Pair" button is disabled for the duration - see showNewPair).
  async function playLoadingBumper() {
    const anim = getLottieAnim();
    if (!anim || prefersReducedMotion) return;

    loadingOverlay.classList.add("active");

    anim.setDirection(1);
    anim.goToAndPlay(0, true);
    await waitForComplete(anim);

    anim.setDirection(-1);
    anim.play();
    await waitForComplete(anim);

    loadingOverlay.classList.remove("active");
  }

  function showNewPair() {
    if (getActorsBtn.disabled) return;
    getActorsBtn.disabled = true;
    playLoadingBumper().finally(() => {
      getActorsBtn.disabled = false;
    });

    replayAnimation(vsBadge, "pop");
    burstSparks(vsBadge);

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
        removeBtn.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#icon-close"></use></svg>';
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

  function closeDialogAnimated() {
    if (manageDialog.classList.contains("closing")) return;
    manageDialog.classList.add("closing");
    const onEnd = () => {
      manageDialog.classList.remove("closing");
      manageDialog.close();
      manageDialog.removeEventListener("animationend", onEnd);
    };
    manageDialog.addEventListener("animationend", onEnd);
  }

  getActorsBtn.addEventListener("click", showNewPair);

  manageBtn.addEventListener("click", () => {
    renderActorList();
    addError.textContent = "";
    newActorInput.value = "";
    manageDialog.showModal();
  });

  manageForm.addEventListener("submit", (e) => {
    e.preventDefault();
    closeDialogAnimated();
  });

  manageDialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    closeDialogAnimated();
  });

  addActorBtn.addEventListener("click", addActor);
  newActorInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addActor();
    }
  });

  resetBtn.addEventListener("click", resetToDefaults);

  addRippleEffect(getActorsBtn);
  addRippleEffect(addActorBtn);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {
        // Offline support is a bonus, not a requirement - ignore failures.
      });
    });
  }
})();
