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
    window.matchMedia("(min-width: 601px)").addEventListener("change", (event) => {
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
