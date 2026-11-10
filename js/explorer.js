(() => {
  "use strict";

  const data = window.MissionHubData;
  if (!data) {
    return;
  }

  const number = new Intl.NumberFormat("en-US");
  const categoryNames = {
    orbital: "Orbital",
    recovery: "Recovery",
    crewed: "Crewed",
    "deep-space": "Deep space",
    "test-flight": "Test flight",
  };

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

  function image(src, alt, className) {
    const node = element("img", className);
    node.src = src;
    node.alt = alt;
    node.loading = "lazy";
    node.decoding = "async";
    return node;
  }

  function sourceLink(url, text) {
    const link = element("a", "text-link", text);
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    return link;
  }

  function dateLabel(value) {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${value}T12:00:00Z`));
  }

  function addDefinition(list, label, value) {
    const group = element("div");
    group.append(element("dt", "", label), element("dd", "", value));
    list.append(group);
  }

  function initFleet() {
    const grid = document.querySelector("#fleet-grid");
    if (!grid) {
      return;
    }
    const selected = new Set();
    const count = document.querySelector("#compare-count");
    const comparison = document.querySelector("#fleet-comparison");
    const notice = document.querySelector("#compare-notice");
    const fragment = document.createDocumentFragment();

    data.fleet.forEach((vehicle, index) => {
      const card = element("article", "fleet-card");
      card.dataset.vehicle = vehicle.id;
      card.append(image(vehicle.image, vehicle.alt, "fleet-image"));
      const body = element("div", "fleet-body");
      body.append(
        element(
          "p",
          "eyebrow",
          `${String(index + 1).padStart(2, "0")} / ${vehicle.tagline.toUpperCase()}`,
        ),
        element("h2", "", vehicle.name),
        element("p", "muted", vehicle.description),
        element("span", "vehicle-status", vehicle.status),
      );
      const stats = element("dl", "fleet-stats");
      addDefinition(stats, "HEIGHT", `${number.format(vehicle.height)} m`);
      addDefinition(
        stats,
        vehicle.id === "dragon" ? "CAPACITY" : "PAYLOAD REFERENCE",
        `${number.format(vehicle.payload / 1000)} t`,
      );
      const button = element("button", "compare-button btn btn-outline", "Compare +");
      button.type = "button";
      button.dataset.compare = vehicle.id;
      button.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-label", `Select ${vehicle.name} for comparison`);
      body.append(stats, button);
      card.append(body);
      fragment.append(card);
    });
    grid.replaceChildren(fragment);

    function updateComparison() {
      count.textContent = `${selected.size} / 2 SELECTED`;
      grid.querySelectorAll("[data-compare]").forEach((button) => {
        const active = selected.has(button.dataset.compare);
        const vehicle = data.fleet.find((item) => item.id === button.dataset.compare);
        button.setAttribute("aria-pressed", String(active));
        button.setAttribute(
          "aria-label",
          `${active ? "Remove" : "Select"} ${vehicle.name} ${active ? "from" : "for"} comparison`,
        );
        button.textContent = active ? "Selected ✓" : "Compare +";
        button.classList.toggle("selected", active);
        button.closest(".fleet-card").classList.toggle("selected", active);
      });

      comparison.hidden = selected.size !== 2;
      if (selected.size !== 2) {
        comparison.replaceChildren();
        return;
      }

      const vehicles = [...selected].map((id) =>
        data.fleet.find((vehicle) => vehicle.id === id),
      );
      const heading = element("div", "comparison-heading");
      heading.append(element("h2", "", "Side by side."));
      const clear = element("button", "text-link", "Clear selection ×");
      clear.type = "button";
      clear.addEventListener("click", () => {
        selected.clear();
        notice.textContent = "Selection cleared. Choose any two vehicles.";
        updateComparison();
        grid.querySelector("[data-compare]").focus();
      });
      heading.append(clear);

      const tableWrap = element("div", "table-responsive");
      const table = element("table", "comparison-table");
      table.append(
        element(
          "caption",
          "visually-hidden",
          `Reference comparison of ${vehicles[0].name} and ${vehicles[1].name}`,
        ),
      );
      const tableHead = element("thead");
      const headerRow = element("tr");
      ["REFERENCE", ...vehicles.map((vehicle) => vehicle.name)].forEach((label) => {
        const cell = element("th", "", label);
        cell.scope = "col";
        headerRow.append(cell);
      });
      tableHead.append(headerRow);
      const tableBody = element("tbody");
      const rows = [
        ["Role", (vehicle) => vehicle.status],
        ["Height", (vehicle) => `${number.format(vehicle.height)} m`],
        ["Diameter / width", (vehicle) => `${number.format(vehicle.diameter)} m`],
        ["Payload reference", (vehicle) => `${number.format(vehicle.payload)} kg`],
        ["Configuration", (vehicle) => vehicle.stages],
        [
          "Reuse approach",
          (vehicle) =>
            vehicle.id === "starship"
              ? "Full reuse design goal"
              : vehicle.id === "dragon"
                ? "Reusable capsule"
                : "Recoverable first stage",
        ],
      ];
      rows.forEach(([label, getValue]) => {
        const row = element("tr");
        const rowTitle = element("th", "", label);
        rowTitle.scope = "row";
        row.append(
          rowTitle,
          ...vehicles.map((vehicle) => element("td", "", getValue(vehicle))),
        );
        tableBody.append(row);
      });
      table.append(tableHead, tableBody);
      tableWrap.append(table);
      const notes = element("div", "comparison-note");
      vehicles.forEach((vehicle) => {
        const paragraph = element("p");
        paragraph.append(
          element("strong", "", `${vehicle.name}: `),
          document.createTextNode(vehicle.note),
          document.createTextNode(" "),
          sourceLink(vehicle.source, "Vehicle source ↗"),
        );
        notes.append(paragraph);
      });
      comparison.replaceChildren(heading, tableWrap, notes);
    }

    grid.addEventListener("click", (event) => {
      const button = event.target.closest("[data-compare]");
      if (!button) {
        return;
      }
      const id = button.dataset.compare;
      if (selected.has(id)) {
        selected.delete(id);
        notice.textContent = "Vehicle removed from comparison.";
      } else if (selected.size < 2) {
        selected.add(id);
        notice.textContent =
          selected.size === 2
            ? "Your comparison is ready below the fleet."
            : "Choose one more vehicle to compare.";
      } else {
        notice.textContent =
          "Two vehicles are already selected. Remove one before adding another.";
      }
      updateComparison();
    });
  }

  function initMissions() {
    const grid = document.querySelector("#mission-grid");
    if (!grid) {
      return;
    }
    const search = document.querySelector("#mission-search");
    const sort = document.querySelector("#mission-sort");
    const filters = [...document.querySelectorAll("[data-category]")];
    const count = document.querySelector("#mission-count");
    const empty = document.querySelector("#mission-empty");
    const reset = document.querySelector("#reset-search");
    const dialog = document.querySelector("#mission-dialog");
    const dialogContent = document.querySelector("#mission-dialog-content");
    let category = "all";
    let visibleMissions = [];
    let dialogMissions = [];
    let dialogIndex = 0;
    let dialogVersion = 0;
    let opener = null;

    function renderMissions() {
      const query = search.value.trim().toLocaleLowerCase();
      visibleMissions = data.missions.filter((mission) => {
        const matchesCategory = category === "all" || mission.category === category;
        const text = [
          mission.id,
          mission.title,
          mission.year,
          mission.vehicle,
          mission.destination,
          mission.description,
          categoryNames[mission.category],
        ]
          .join(" ")
          .toLocaleLowerCase();
        return matchesCategory && text.includes(query);
      });
      visibleMissions.sort((first, second) => {
        if (sort.value === "title") {
          return first.title.localeCompare(second.title);
        }
        const order = first.date.localeCompare(second.date);
        return sort.value === "newest" ? -order : order;
      });
      const fragment = document.createDocumentFragment();
      visibleMissions.forEach((mission) => {
        const card = element("article", "mission-card");
        card.append(image(mission.image, mission.alt, "mission-image"));
        const body = element("div", "mission-body");
        const meta = element("div", "mission-meta");
        const date = element("time", "micro", dateLabel(mission.date));
        date.dateTime = mission.date;
        meta.append(
          date,
          element("span", "mission-category", categoryNames[mission.category]),
        );
        const button = element("button", "mission-open text-link", "Explore mission ↗");
        button.type = "button";
        button.dataset.mission = mission.id;
        button.setAttribute("aria-haspopup", "dialog");
        button.setAttribute("aria-controls", "mission-dialog");
        button.setAttribute("aria-label", `Explore ${mission.title}`);
        body.append(
          meta,
          element("h2", "", mission.title),
          element("p", "muted", mission.highlight),
          button,
        );
        card.append(body);
        fragment.append(card);
      });
      grid.replaceChildren(fragment);
      count.textContent = `${visibleMissions.length} of ${data.missions.length} missions`;
      empty.hidden = visibleMissions.length !== 0;
      grid.hidden = visibleMissions.length === 0;
      filters.forEach((button) => {
        const active = button.dataset.category === category;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
      });
    }

    function missionCaption(mission) {
      return (
        mission.imageCaption ||
        `${mission.vehicle.toUpperCase()} · HISTORICAL MISSION PHOTOGRAPHY`
      );
    }

    function createDialogContent() {
      const mission = dialogMissions[dialogIndex];
      const fragment = document.createDocumentFragment();
      const figure = element("figure", "dialog-figure");
      const photo = image(mission.image, mission.alt, "dialog-image");
      photo.loading = "eager";
      figure.append(
        photo,
        element("figcaption", "image-caption", missionCaption(mission)),
      );
      const body = element("div", "dialog-body");
      const title = element("h2", "", mission.title);
      title.id = "dialog-title";
      const description = element("p", "dialog-description", mission.description);
      description.id = "dialog-description";
      body.append(
        element(
          "p",
          "eyebrow",
          `${categoryNames[mission.category].toUpperCase()} / ${mission.year}`,
        ),
        title,
        description,
      );
      const meta = element("dl", "dialog-meta");
      addDefinition(meta, "DATE · UTC", dateLabel(mission.date));
      addDefinition(meta, "VEHICLE", mission.vehicle);
      addDefinition(meta, "DESTINATION", mission.destination);
      body.append(meta, sourceLink(mission.source, "Read the mission source ↗"));
      const navigation = element("nav", "dialog-navigation");
      navigation.setAttribute("aria-label", "Mission gallery");
      const previous = element("button", "btn btn-outline", "← Previous");
      previous.type = "button";
      previous.dataset.dialogStep = "-1";
      previous.setAttribute("aria-label", "Show previous mission");
      const next = element("button", "btn btn-outline", "Next →");
      next.type = "button";
      next.dataset.dialogStep = "1";
      next.setAttribute("aria-label", "Show next mission");
      previous.disabled = dialogMissions.length < 2;
      next.disabled = dialogMissions.length < 2;
      const position = element(
        "span",
        "micro",
        `${dialogIndex + 1} / ${dialogMissions.length}`,
      );
      position.setAttribute("aria-live", "polite");
      navigation.append(previous, position, next);
      body.append(navigation);
      fragment.append(figure, body);
      return fragment;
    }

    function renderDialog(animate, focusStep) {
      const version = ++dialogVersion;
      const replace = () => {
        if (version !== dialogVersion) {
          return;
        }
        dialogContent.replaceChildren(createDialogContent());
      };
      const focusNavigation = () => {
        if (!focusStep || version !== dialogVersion || !dialog.hasAttribute("open")) {
          return;
        }
        dialogContent
          .querySelector(`[data-dialog-step="${focusStep}"]`)
          ?.focus({ preventScroll: true });
      };
      const reducedMotion =
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (window.jQuery && animate && !reducedMotion) {
        const panel = window.jQuery(dialogContent).stop(true, true);

        const closeButton = dialog.querySelector(".dialog-close");
        closeButton.focus({ preventScroll: true });
        panel.fadeOut(100, () => {
          if (version !== dialogVersion || !dialog.hasAttribute("open")) {
            return;
          }

          if (
            dialogContent.contains(document.activeElement) ||
            !dialog.contains(document.activeElement)
          ) {
            closeButton.focus({ preventScroll: true });
          }
          replace();
          panel.fadeIn(150, () => {
            if (document.activeElement === closeButton) {
              focusNavigation();
            }
          });
        });
      } else {
        if (window.jQuery) {
          window.jQuery(dialogContent).stop(true, true).show();
        }
        replace();
        focusNavigation();
      }
    }

    function closeDialog() {
      if (typeof dialog.close === "function") {
        dialog.close();
      } else {
        dialog.removeAttribute("open");
        restoreDialogFocus();
      }
    }

    function restoreDialogFocus() {
      dialogVersion += 1;
      if (window.jQuery) {
        window.jQuery(dialogContent).stop(true, true).show();
      }
      document.body.classList.remove("dialog-open");
      if (opener && opener.isConnected) {
        opener.focus({ preventScroll: true });
      }
    }

    function moveDialog(step) {
      dialogIndex = (dialogIndex + step + dialogMissions.length) % dialogMissions.length;
      renderDialog(true, step);
    }

    search.addEventListener("input", renderMissions);
    sort.addEventListener("change", renderMissions);
    filters.forEach((button) =>
      button.addEventListener("click", () => {
        category = button.dataset.category;
        renderMissions();
      }),
    );
    reset.addEventListener("click", () => {
      search.value = "";
      category = "all";
      sort.value = "oldest";
      renderMissions();
      search.focus();
    });
    grid.addEventListener("click", (event) => {
      const button = event.target.closest("[data-mission]");
      if (!button) {
        return;
      }
      opener = button;
      dialogMissions = visibleMissions.slice();
      dialogIndex = dialogMissions.findIndex(
        (mission) => mission.id === button.dataset.mission,
      );
      renderDialog(false);
      dialog.setAttribute("aria-describedby", "dialog-description");
      if (typeof dialog.showModal === "function") {
        dialog.showModal();
      } else {
        dialog.setAttribute("open", "");
        dialog.setAttribute("aria-modal", "true");
      }
      document.body.classList.add("dialog-open");
      dialog.querySelector(".dialog-close").focus({ preventScroll: true });
    });
    dialog.querySelector(".dialog-close").addEventListener("click", closeDialog);
    dialogContent.addEventListener("click", (event) => {
      const button = event.target.closest("[data-dialog-step]");
      if (button) {
        moveDialog(Number(button.dataset.dialogStep));
      }
    });
    dialog.addEventListener("keydown", (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        if (dialogMissions.length > 1) {
          moveDialog(event.key === "ArrowRight" ? 1 : -1);
        }
      }
      if (event.key === "Escape") {
        event.preventDefault();
        closeDialog();
      }

      if (event.key === "Tab") {
        const focusable = [
          ...dialog.querySelectorAll("button:not(:disabled), a[href]"),
        ].filter(
          (control) =>
            control.getClientRects().length &&
            getComputedStyle(control).visibility !== "hidden",
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeDialog();
    });
    dialog.addEventListener("close", restoreDialogFocus);
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) {
        return;
      }
      const bounds = dialog.getBoundingClientRect();
      const outside =
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom;
      if (outside) {
        closeDialog();
      }
    });
    renderMissions();
  }

  function initQuiz() {
    const panel = document.querySelector("#space-quiz");
    if (!panel) {
      return;
    }
    let current = 0;
    let score = 0;
    let chosen = null;

    function renderQuestion(focusQuestion) {
      const question = data.quiz[current];
      const progress = element(
        "p",
        "quiz-progress micro",
        `QUESTION ${String(current + 1).padStart(2, "0")} / ${String(data.quiz.length).padStart(2, "0")}`,
      );
      const title = element("h3", "quiz-question", question.question);
      title.tabIndex = -1;
      const options = element("div", "quiz-options");
      options.setAttribute("role", "group");
      options.setAttribute("aria-label", "Choose one answer");
      question.options.forEach((option, index) => {
        const button = element("button", "quiz-option", option);
        button.type = "button";
        button.dataset.answer = String(index);
        button.setAttribute("aria-pressed", String(chosen === index));
        if (chosen !== null) {
          button.disabled = true;
          if (index === question.answer) {
            button.classList.add("correct");
            button.append(element("span", "answer-indicator", " ✓ Correct answer"));
          } else if (index === chosen) {
            button.classList.add("incorrect", "selected");
            button.append(element("span", "answer-indicator", " × Your answer"));
          }
        }
        options.append(button);
      });
      panel.replaceChildren(progress, title, options);
      if (chosen !== null) {
        const correct = chosen === question.answer;
        const feedback = element(
          "p",
          `quiz-feedback ${correct ? "is-correct" : "is-incorrect"}`,
          `${correct ? "Correct. " : "Keep exploring. "}${question.explanation}`,
        );
        feedback.setAttribute("role", "status");
        const next = element(
          "button",
          "btn btn-accent",
          current === data.quiz.length - 1 ? "See my score ↗" : "Next question →",
        );
        next.type = "button";
        next.dataset.quizNext = "";
        panel.append(feedback, next);
        next.focus({ preventScroll: true });
      } else if (focusQuestion) {
        title.focus({ preventScroll: true });
      }
    }

    function renderScore() {
      const percentage = Math.round((score / data.quiz.length) * 100);
      const title = element(
        "h3",
        "quiz-question",
        score === data.quiz.length ? "All systems go." : "Curiosity is how we get there.",
      );
      title.tabIndex = -1;
      const scoreText = element("p", "quiz-score", `${score} / ${data.quiz.length}`);
      scoreText.setAttribute(
        "aria-label",
        `${score} correct answers out of ${data.quiz.length}, ${percentage} percent`,
      );
      const message = element(
        "p",
        "muted",
        `You answered ${percentage}% correctly. Explore the mission archive, then try another systems check.`,
      );
      const restart = element("button", "btn btn-accent", "Try again ↻");
      restart.type = "button";
      restart.dataset.quizRestart = "";
      const archive = element("a", "text-link", "Explore the missions ↗");
      archive.href = "missions.html";
      panel.replaceChildren(
        element("p", "eyebrow", "SYSTEMS CHECK COMPLETE"),
        title,
        scoreText,
        message,
        restart,
        archive,
      );
      title.focus({ preventScroll: true });
    }

    panel.addEventListener("click", (event) => {
      const answer = event.target.closest("[data-answer]");
      if (answer && chosen === null) {
        const choice = Number(answer.dataset.answer);
        if (!Number.isInteger(choice) || !data.quiz[current].options[choice]) {
          return;
        }
        chosen = choice;
        if (chosen === data.quiz[current].answer) {
          score += 1;
        }
        renderQuestion(false);
      } else if (event.target.closest("[data-quiz-next]") && chosen !== null) {
        current += 1;
        chosen = null;
        if (current === data.quiz.length) {
          renderScore();
        } else {
          renderQuestion(true);
        }
      } else if (event.target.closest("[data-quiz-restart]")) {
        current = 0;
        score = 0;
        chosen = null;
        renderQuestion(true);
      }
    });
    renderQuestion(false);
  }

  initFleet();
  initMissions();
  initQuiz();
})();
