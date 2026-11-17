(() => {
  "use strict";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const menuButton = document.querySelector(".menu-toggle");
  const menu = document.querySelector("#main-nav");
  function closeMenu(returnFocus = false) {
    if (!menuButton || !menu) {
      return;
    }
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Open navigation");
    menu.classList.remove("is-open");
    if (returnFocus) {
      menuButton.focus();
    }
  }
  if (menuButton && menu) {
    menuButton.addEventListener("click", () => {
      const open = menuButton.getAttribute("aria-expanded") !== "true";
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.setAttribute(
        "aria-label",
        open ? "Close navigation" : "Open navigation",
      );
      menu.classList.toggle("is-open", open);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menu.classList.contains("is-open")) {
        closeMenu(true);
      }
    });
    document.addEventListener("click", (event) => {
      if (!event.target.closest(".nav-shell")) {
        closeMenu();
      }
    });
    menu
      .querySelectorAll("a")
      .forEach((link) => link.addEventListener("click", () => closeMenu()));
    window.matchMedia("(min-width: 1024px)").addEventListener("change", (event) => {
      if (event.matches) {
        closeMenu();
      }
    });
  }

  const motionButton = document.querySelector(".motion-toggle");
  let paused = reducedMotion.matches;
  try {
    const preference = localStorage.getItem("mission-hub-motion");
    if (preference !== null) {
      paused = preference === "paused";
    }
  } catch (_) {}
  function applyMotion() {
    document.body.classList.toggle("motion-paused", paused);

    document.body.classList.toggle("motion-enabled", !paused);
    if (motionButton) {
      motionButton.setAttribute("aria-pressed", String(paused));
      motionButton.replaceChildren();
      const icon = document.createElement("span");
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = paused ? "▷" : "Ⅱ";
      motionButton.append(
        icon,
        document.createTextNode(paused ? " Play motion" : " Pause motion"),
      );
    }
    if (window.jQuery) {
      window.jQuery.fx.off = paused || reducedMotion.matches;
    }
  }
  applyMotion();
  if (motionButton) {
    motionButton.addEventListener("click", () => {
      paused = !paused;
      applyMotion();
      try {
        localStorage.setItem("mission-hub-motion", paused ? "paused" : "playing");
      } catch (_) {}
    });
  }
  reducedMotion.addEventListener("change", (event) => {
    paused = event.matches;
    applyMotion();
  });

  const twinkles = document.querySelector(".twinkle-layer");
  if (twinkles) {
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < 24; index += 1) {
      const star = document.createElement("span");
      star.className = "twinkle-star";
      star.style.left = `${(index * 37 + 11) % 97}%`;
      star.style.top = `${(index * 23 + 7) % 69}%`;
      star.style.animationDelay = `${(index % 7) * -0.8}s`;
      star.style.animationDuration = `${3 + (index % 5)}s`;
      fragment.append(star);
    }
    twinkles.append(fragment);
  }

  document.querySelectorAll(".faq-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const answer = document.getElementById(button.getAttribute("aria-controls"));
      if (!answer) {
        return;
      }
      const opening = button.getAttribute("aria-expanded") !== "true";
      button.setAttribute("aria-expanded", String(opening));
      if (window.jQuery) {
        const panel = window.jQuery(answer);
        panel.stop(true, true);
        if (opening) {
          answer.hidden = false;
          panel.hide().slideDown(220);
        } else {
          panel.slideUp(180, () => {
            answer.hidden = true;
          });
        }
      } else {
        answer.hidden = !opening;
      }
    });
  });

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    const id = link.getAttribute("href").slice(1);
    if (!id) {
      return;
    }
    const target = document.getElementById(id);
    if (!target) {
      return;
    }
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const finish = () => {
        if (!target.hasAttribute("tabindex")) {
          target.setAttribute("tabindex", "-1");
        }
        target.focus({ preventScroll: true });
      };
      if (window.jQuery && !paused && !reducedMotion.matches) {
        window
          .jQuery("html, body")
          .stop(true, false)
          .animate(
            {
              scrollTop: Math.max(
                0,
                target.getBoundingClientRect().top + window.scrollY - 25,
              ),
            },
            550,
          )
          .promise()
          .done(finish);
      } else {
        target.scrollIntoView();
        finish();
      }
      history.replaceState(null, "", `#${id}`);
    });
  });

  /* ---------- Saved data in the navigation bar ---------- */
  const store = window.MissionStore;

  // Creates an element with a class and text — shared by all page scripts.
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    if (text !== undefined) {
      node.textContent = text;
    }
    return node;
  }

  function firstName(name) {
    return String(name).trim().split(/\s+/)[0];
  }

  function updateNavigation(bump) {
    if (!store) {
      return;
    }
    const count = store.savedCount();
    document.querySelectorAll("[data-saved-count]").forEach((badge) => {
      badge.textContent = String(count);
      badge.dataset.count = String(count);
    });
    if (bump) {
      document.querySelectorAll(".saved-link").forEach((link) => {
        link.classList.remove("bump");
        // Reading offsetWidth restarts the CSS animation.
        void link.offsetWidth;
        link.classList.add("bump");
      });
    }

    const user = store.currentUser();
    document.querySelectorAll("[data-account-link]").forEach((link) => {
      link.href = user ? "profile.html" : "account.html";
      link.classList.toggle("is-member", Boolean(user));
      link.querySelector("[data-account-label]").textContent = user
        ? firstName(user.name)
        : "Log in";
      link.querySelector("[data-account-initial]").textContent = user
        ? firstName(user.name).charAt(0).toUpperCase()
        : "";
      link.setAttribute(
        "aria-label",
        user ? `Profile of ${user.name}` : "Log in or sign up",
      );
    });
  }

  /* ---------- Toast message (jQuery fade) ---------- */
  let toast = null;
  function showToast(message) {
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast-note";
      toast.setAttribute("role", "status");
      document.body.append(toast);
    }
    if (window.jQuery) {
      // stop(true, true) finishes the previous toast, so fast clicks never queue up.
      const $toast = window.jQuery(toast).stop(true, true).css("opacity", 0).show();
      toast.textContent = message;
      $toast.animate({ opacity: 1 }, 180).delay(2600).fadeOut(320);
    } else {
      toast.textContent = message;
      toast.style.display = "block";
      window.clearTimeout(showToast.timer);
      showToast.timer = window.setTimeout(() => {
        toast.style.display = "none";
      }, 2800);
    }
  }

  /* ---------- Save buttons (fleet cards, mission cards, mission dialog) ---------- */
  function syncSaveButtons(scope = document) {
    if (!store) {
      return;
    }
    scope.querySelectorAll("[data-save-type]").forEach((button) => {
      const saved = store.isSaved(button.dataset.saveType, button.dataset.saveId);
      button.setAttribute("aria-pressed", String(saved));
      button.querySelector(".save-label").textContent = saved ? "Saved" : "Save";
    });
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-save-type]");
    if (!button || !store) {
      return;
    }
    const saved = store.toggleSaved(button.dataset.saveType, button.dataset.saveId);
    const count = store.savedCount();
    showToast(
      saved
        ? `★ ${button.dataset.saveName} is saved. Your mission log has ${count} ${count === 1 ? "item" : "items"}.`
        : `${button.dataset.saveName} was removed from your mission log.`,
    );
  });

  // Every change of saved data (on this page or in another tab) refreshes the UI.
  document.addEventListener("missionhub:change", () => {
    updateNavigation(true);
    syncSaveButtons();
  });
  window.addEventListener("storage", (event) => {
    if (event.key && event.key.startsWith("missionHub.")) {
      updateNavigation(false);
      syncSaveButtons();
    }
  });
  updateNavigation(false);

  window.MissionUI = { element, firstName, toast: showToast, syncSaveButtons };

  const credits = document.querySelector("#image-credits");
  if (credits && Array.isArray(window.ImageCredits)) {
    const fragment = document.createDocumentFragment();
    window.ImageCredits.forEach((item) => {
      const article = document.createElement("article");
      article.className = "credit-item";
      const image = document.createElement("img");
      image.src = `NANOO/${item.file}`;
      image.alt = item.title;
      image.width = image.height = 65;
      image.loading = "lazy";
      const copy = document.createElement("div");
      const heading = document.createElement("h4");
      heading.textContent = item.title;
      const author = document.createElement("p");
      author.textContent = item.credit;
      const license = document.createElement("p");
      license.textContent = item.license;
      const links = document.createElement("div");
      links.className = "credit-links";
      if (!item.url && !item.licenseUrl) {
        links.textContent = "Source: the Mission Hub team";
      }
      for (const [url, label] of [
        [item.url, "Original source ↗"],
        [item.licenseUrl, "Usage terms ↗"],
      ]) {
        if (!url || !/^https:\/\//.test(url)) {
          continue;
        }
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.textContent = label;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        links.append(anchor);
      }
      copy.append(heading, author, license, links);
      article.append(image, copy);
      fragment.append(article);
    });
    credits.append(fragment);
  }
})();
