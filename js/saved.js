/*
 * Mission log (saved.html): shows the missions, vehicles and mission briefs
 * saved on other pages, with counters and the total fictional budget.
 * Items can be removed one by one or all at once.
 */
(() => {
  "use strict";

  const store = window.MissionStore;
  const data = window.MissionHubData;
  const itemsGrid = document.querySelector("#log-items");
  if (!store || !data || !itemsGrid) {
    return;
  }

  const count = document.querySelector("#log-count");
  const itemsCount = document.querySelector("#items-count");
  const itemsEmpty = document.querySelector("#items-empty");
  const briefsBody = document.querySelector("#log-briefs");
  const briefsTable = document.querySelector("#briefs-table");
  const briefsCount = document.querySelector("#briefs-count");
  const briefsEmpty = document.querySelector("#briefs-empty");
  const briefsTotal = document.querySelector("#briefs-total");
  const emptyState = document.querySelector("#log-empty");
  const sections = document.querySelectorAll(".log-section");
  const clearButton = document.querySelector("#clear-log");
  const confirmPanel = document.querySelector("#clear-confirm");
  const confirmQuestion = document.querySelector("#clear-question");
  const $ = window.jQuery;

  const number = new Intl.NumberFormat("en-US");
  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  const shortDate = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const { element } = window.MissionUI;

  function plural(amount, word) {
    return `${amount} ${word}${amount === 1 ? "" : "s"}`;
  }

  // Turns a saved {type, id} into the full mission or vehicle from data.js.
  function describe(item) {
    if (item.type === "mission") {
      const mission = data.missions.find((entry) => entry.id === item.id);
      return mission
        ? {
            title: mission.title,
            image: mission.image,
            alt: mission.alt,
            kicker: `MISSION · ${mission.year} · ${mission.vehicle.toUpperCase()}`,
            text: mission.highlight,
            link: `missions.html?mission=${encodeURIComponent(mission.id)}`,
            linkText: "Open mission ↗",
          }
        : null;
    }
    const vehicle = data.fleet.find((entry) => entry.id === item.id);
    return vehicle
      ? {
          title: vehicle.name,
          image: vehicle.image,
          alt: vehicle.alt,
          kicker: `VEHICLE · ${vehicle.status.toUpperCase()}`,
          text: vehicle.tagline,
          link: "fleet.html",
          linkText: "Compare in the fleet ↗",
        }
      : null;
  }

  function removeButton(label, onRemove) {
    const button = element("button", "remove-button", "Remove ×");
    button.type = "button";
    button.setAttribute("aria-label", `Remove ${label} from the mission log`);
    button.addEventListener("click", () => {
      // Disabled at once, so a fast double click cannot remove twice.
      if (button.disabled) {
        return;
      }
      button.disabled = true;
      onRemove(button);
    });
    return button;
  }

  // Fades and slides the element away (jQuery), then updates the storage.
  function animateRemoval(node, update) {
    const done = () => {
      update();
      count.focus({ preventScroll: true });
    };
    if ($) {
      $(node).stop(true, true).animate({ opacity: 0 }, 160).slideUp(220, done);
    } else {
      done();
    }
  }

  function renderItems(items) {
    const fragment = document.createDocumentFragment();
    items.forEach((item) => {
      const info = describe(item);
      const card = element("article", "log-card");
      const image = element("img", "log-image");
      image.src = info.image;
      image.alt = info.alt;
      image.loading = "lazy";
      const body = element("div", "log-body");
      const savedOn = element(
        "p",
        "log-date",
        `Saved ${shortDate.format(new Date(item.savedAt))}`,
      );
      const open = element("a", "text-link", info.linkText);
      open.href = info.link;
      const actions = element("div", "log-actions");
      actions.append(
        open,
        removeButton(info.title, () =>
          animateRemoval(card, () => store.removeSaved(item.type, item.id)),
        ),
      );
      body.append(
        element("p", "eyebrow", info.kicker),
        element("h3", "", info.title),
        element("p", "muted", info.text),
        savedOn,
        actions,
      );
      card.append(image, body);
      fragment.append(card);
    });
    itemsGrid.replaceChildren(fragment);
  }

  function renderBriefs(briefs) {
    const fragment = document.createDocumentFragment();
    briefs.forEach((brief) => {
      const row = element("tr");
      const name = element("th", "", brief.missionName);
      name.scope = "row";
      const remove = element("td");
      remove.append(
        removeButton(brief.missionName, () =>
          animateRemoval(row, () => store.removeBrief(brief.id)),
        ),
      );
      row.append(
        name,
        element("td", "", brief.vehicle),
        element("td", "", brief.destination),
        element("td", "", `${number.format(brief.payload)} kg`),
        element("td", "", brief.launchDate),
        element("td", "numeric", money.format(brief.budget)),
        remove,
      );
      fragment.append(row);
    });
    briefsBody.replaceChildren(fragment);
    briefsTotal.textContent = money.format(store.briefsTotal());
  }

  function render() {
    // Items whose data no longer exists are skipped.
    const items = store.getSaved().filter((item) => describe(item));
    const briefs = store.getBriefs();
    const total = items.length + briefs.length;

    count.textContent =
      total === 0
        ? "Nothing saved yet"
        : `${plural(total, "saved item")} · ${plural(items.length, "card")} · ${plural(briefs.length, "brief")}`;
    itemsCount.textContent = items.length ? `(${items.length})` : "";
    briefsCount.textContent = briefs.length ? `(${briefs.length})` : "";

    emptyState.hidden = total !== 0;
    sections.forEach((section) => {
      section.hidden = total === 0;
    });
    clearButton.hidden = total === 0;
    if (total === 0) {
      closeConfirm(false);
    }

    renderItems(items);
    itemsEmpty.hidden = items.length !== 0;
    itemsGrid.hidden = items.length === 0;

    renderBriefs(briefs);
    briefsEmpty.hidden = briefs.length !== 0;
    briefsTable.hidden = briefs.length === 0;
  }

  /* ---------- Clear all, with a confirmation step ---------- */

  function openConfirm() {
    confirmQuestion.textContent = `Remove all ${plural(store.savedCount(), "saved item")}? This cannot be undone.`;
    clearButton.setAttribute("aria-expanded", "true");
    if ($) {
      $(confirmPanel).stop(true, true);
      confirmPanel.hidden = false;
      $(confirmPanel).hide().slideDown(200);
    } else {
      confirmPanel.hidden = false;
    }
    document.querySelector("#cancel-clear").focus();
  }

  function closeConfirm(animate) {
    clearButton.setAttribute("aria-expanded", "false");
    if (confirmPanel.hidden) {
      return;
    }
    if ($ && animate) {
      $(confirmPanel)
        .stop(true, true)
        .slideUp(180, () => {
          confirmPanel.hidden = true;
        });
    } else {
      confirmPanel.hidden = true;
    }
  }

  clearButton.addEventListener("click", () => {
    if (confirmPanel.hidden) {
      openConfirm();
    } else {
      closeConfirm(true);
    }
  });
  document.querySelector("#cancel-clear").addEventListener("click", () => {
    closeConfirm(true);
    clearButton.focus();
  });
  document.querySelector("#confirm-clear").addEventListener("click", () => {
    const removed = store.savedCount();
    closeConfirm(false);
    store.clearAll();
    window.MissionUI?.toast(`Mission log cleared: ${plural(removed, "item")} removed.`);
    count.focus({ preventScroll: true });
  });

  document.addEventListener("missionhub:change", render);
  window.addEventListener("storage", (event) => {
    if (event.key && event.key.startsWith("missionHub.")) {
      render();
    }
  });
  render();
})();
