(function () {
  "use strict";

  const STORAGE_KEY = "movieConnect.customActors";

  const actor1El = document.getElementById("actor-1");
  const actor2El = document.getElementById("actor-2");
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

  function showNewPair() {
    const pair = pickPair();
    if (!pair) {
      actor1El.textContent = "Add some actors first";
      actor2El.textContent = "";
      return;
    }
    actor1El.textContent = pair[0];
    actor2El.textContent = pair[1];
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
