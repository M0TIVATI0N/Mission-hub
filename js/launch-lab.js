(() => {
  "use strict";

  function initializeLaunchLab() {
    const form = document.querySelector("#mission-form");
    const model = window.MissionHubData?.launch;
    if (!form || !model) {
      return;
    }

    const controls = {
      missionName: document.querySelector("#mission-name"),
      commanderName: document.querySelector("#commander-name"),
      email: document.querySelector("#mission-email"),
      vehicle: document.querySelector("#launch-vehicle"),
      destination: document.querySelector("#mission-destination"),
      payload: document.querySelector("#payload-mass"),
      launchDate: document.querySelector("#launch-date"),
      profile: document.querySelector("#mission-profile"),
      consent: document.querySelector("#simulation-consent"),
    };
    const touched = new Set();
    let clearingForm = false;
    const submitButton = form.querySelector('button[type="submit"]');
    const success = document.querySelector("#mission-success");
    const numberFormat = new Intl.NumberFormat("en-US");
    const currencyFormat = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function todayInAlmaty() {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Almaty",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(new Date());
      const value = (type) => parts.find((part) => part.type === type).value;
      return `${value("year")}-${value("month")}-${value("day")}`;
    }

    function refreshMinimumDate() {
      const tomorrow = new Date(`${todayInAlmaty()}T12:00:00Z`);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      controls.launchDate.min = tomorrow.toISOString().slice(0, 10);
    }

    function fillSelect(control, items, placeholder) {
      const fragment = document.createDocumentFragment();
      const empty = document.createElement("option");
      empty.value = "";
      empty.textContent = placeholder;
      fragment.append(empty);
      for (const item of items) {
        const option = document.createElement("option");
        option.value = item.id;
        option.textContent = item.name;
        fragment.append(option);
      }
      control.replaceChildren(fragment);
    }

    fillSelect(controls.vehicle, model.vehicles, "Choose your rocket");
    fillSelect(controls.destination, model.destinations, "Choose your destination");
    fillSelect(controls.profile, model.profiles, "What will your mission do?");

    const requestedDestination = new URLSearchParams(window.location.search).get(
      "destination",
    );
    if (model.destinations.some((item) => item.id === requestedDestination)) {
      controls.destination.value = requestedDestination;
    }
    refreshMinimumDate();

    function selectedConfiguration() {
      const vehicle = model.vehicles.find((item) => item.id === controls.vehicle.value);
      const destination = model.destinations.find(
        (item) => item.id === controls.destination.value,
      );
      const profile = model.profiles.find((item) => item.id === controls.profile.value);
      const payload = Number(controls.payload.value);
      const capacity =
        vehicle && destination
          ? Math.floor(vehicle.capacityKg * destination.capacityFactor)
          : null;
      return { vehicle, destination, profile, payload, capacity };
    }

    function isCalendarDate(value) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
      }
      const parsed = new Date(`${value}T12:00:00Z`);
      return (
        !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
      );
    }

    function validationMessage(key) {
      const control = controls[key];
      const value = control.value.trim();
      const configuration = selectedConfiguration();
      switch (key) {
        case "missionName":
          if (!value) {
            return "Give your mission a name.";
          }
          if (value.length < 3 || value.length > 40) {
            return "Use 3–40 characters for your mission name.";
          }
          if (!/^[\p{L}\p{N} -]+$/u.test(value)) {
            return "Use letters, numbers, spaces, and hyphens only.";
          }
          return "";
        case "commanderName":
          if (!value) {
            return "Enter your name.";
          }
          if (
            value.length < 2 ||
            value.length > 80 ||
            !/^[\p{L}][\p{L}\p{M} .’'\-]*$/u.test(value) ||
            (value.match(/\p{L}/gu) || []).length < 2
          ) {
            return "Enter a name with at least two letters. Spaces, apostrophes, and hyphens are allowed.";
          }
          return "";
        case "email":
          if (!value) {
            return "Enter your email address.";
          }
          if (value.length > 120 || !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(value)) {
            return "Enter an email address like you@example.com.";
          }
          return "";
        case "vehicle":
          return configuration.vehicle ? "" : "Choose one of the listed launch vehicles.";
        case "destination":
          return configuration.destination
            ? ""
            : "Choose one of the listed destinations.";
        case "payload":
          if (!value) {
            return "Enter your payload mass in kilograms.";
          }
          if (!Number.isSafeInteger(configuration.payload) || configuration.payload < 1) {
            return "Enter a whole number of kilograms greater than zero.";
          }
          if (
            configuration.capacity !== null &&
            configuration.payload > configuration.capacity
          ) {
            return `This combination supports up to ${numberFormat.format(configuration.capacity)} kg in the simulator. Reduce the payload or change your route.`;
          }
          return "";
        case "launchDate":
          if (!value) {
            return "Choose a preferred launch date.";
          }
          if (!isCalendarDate(value)) {
            return "Choose a valid calendar date.";
          }
          if (value <= todayInAlmaty()) {
            return "Choose a future date, starting tomorrow in Almaty time.";
          }
          return "";
        case "profile":
          return configuration.profile
            ? ""
            : "Choose one of the listed mission purposes.";
        case "consent":
          return control.checked
            ? ""
            : "Confirm that you understand this is an educational simulation.";
        default:
          return "";
      }
    }

    function showValidation(key) {
      const control = controls[key];
      const error = document.getElementById(`${control.id}-error`);
      const message = touched.has(key) ? validationMessage(key) : "";
      error.textContent = message;
      control.classList.toggle("is-invalid", Boolean(message));
      if (message) {
        control.setAttribute("aria-invalid", "true");
      } else {
        control.removeAttribute("aria-invalid");
      }
      return !message;
    }

    function calculateBudget(configuration) {
      const { vehicle, destination, profile, payload } = configuration;
      return Math.round(
        (vehicle.baseCostUsd + payload * vehicle.ratePerKg) *
          destination.multiplier *
          (profile?.multiplier ?? 1),
      );
    }

    function updateEstimate() {
      const configuration = selectedConfiguration();
      const { vehicle, destination, profile, payload, capacity } = configuration;
      document.querySelector("#estimate-vehicle").textContent =
        vehicle?.name || "Awaiting selection";
      document.querySelector("#estimate-destination").textContent =
        destination?.name || "Awaiting selection";
      document.querySelector("#estimate-capacity").textContent =
        capacity === null ? "—" : `${numberFormat.format(capacity)} kg`;
      document.querySelector("#payload-capacity").textContent =
        capacity === null
          ? "Choose a rocket and destination to see capacity."
          : `Simulator limit for this route: ${numberFormat.format(capacity)} kg.`;
      if (capacity === null) {
        controls.payload.removeAttribute("max");
      } else {
        controls.payload.max = String(capacity);
      }

      const validPayload =
        controls.payload.value.trim() !== "" &&
        Number.isSafeInteger(payload) &&
        payload > 0;
      const percentage = capacity && validPayload ? (payload / capacity) * 100 : 0;
      const visiblePercentage = Math.max(0, Math.min(100, percentage));
      const bar = document.querySelector(".capacity-bar");
      bar.querySelector("span").style.width = `${visiblePercentage}%`;
      bar.setAttribute("aria-valuenow", String(Math.round(visiblePercentage)));
      bar.setAttribute(
        "aria-valuetext",
        capacity && validPayload
          ? `${Math.round(percentage)}% of simulated capacity${payload > capacity ? "; payload exceeds the limit" : ""}`
          : "Choose a route and payload to calculate capacity used",
      );
      bar.classList.toggle(
        "over-capacity",
        Boolean(capacity && validPayload && payload > capacity),
      );

      const cost = document.querySelector("#estimate-cost");
      const note = document.querySelector("#estimate-note");
      if (!vehicle || !destination || !validPayload) {
        cost.textContent = "—";
        note.textContent =
          "Select a vehicle and destination, then enter a positive whole-number payload.";
      } else if (payload > capacity) {
        cost.textContent = "Over capacity";
        note.textContent = `Reduce your payload to ${numberFormat.format(capacity)} kg or choose another route.`;
      } else {
        cost.textContent = currencyFormat.format(calculateBudget(configuration));
        note.textContent = profile
          ? `${numberFormat.format(payload)} kg · ${Math.round(percentage)}% of simulated capacity · ${profile.name}. Fictional training estimate.`
          : "Fictional training estimate shown before purpose adjustment. Choose a mission purpose to complete it.";
      }
    }

    function element(tag, className, content) {
      const node = document.createElement(tag);
      if (className) {
        node.className = className;
      }
      if (content !== undefined) {
        node.textContent = content;
      }
      return node;
    }

    function downloadBrief(text, missionName) {
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${missionName.replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "") || "mission"}-brief.txt`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function renderBrief(configuration, missionName, commanderName, launchDate) {
      const { vehicle, destination, profile, payload, capacity } = configuration;
      const budget = currencyFormat.format(calculateBudget(configuration));
      const rows = [
        ["Commander", commanderName],
        ["Vehicle", vehicle.name],
        ["Destination", destination.name],
        ["Payload", `${numberFormat.format(payload)} kg`],
        ["Preferred date", `${launchDate} · Almaty calendar date`],
        ["Mission purpose", profile.name],
        ["Capacity used", `${Math.round((payload / capacity) * 100)}%`],
        ["Fictional planning budget", budget],
      ];
      const eyebrow = element(
        "p",
        "eyebrow",
        "TRANSMISSION CONFIRMED / SIMULATION COMPLETE",
      );
      const heading = element("h2", "", `${missionName}: ready for review.`);
      const description = element(
        "p",
        "muted",
        "Your educational mission brief is ready. The form has been cleared; nothing was sent or booked.",
      );
      const facts = element("dl", "brief-grid");
      for (const [label, value] of rows) {
        const pair = element("div", "brief-line");
        pair.append(element("dt", "", label), element("dd", "", value));
        facts.append(pair);
      }
      const disclaimer = element("p", "field-hint", model.note);
      const actions = element("div", "brief-actions");
      const download = element("button", "btn btn-accent", "Download mission brief ↓");
      download.type = "button";
      download.id = "download-brief";
      const briefText = [
        "MISSION HUB — EDUCATIONAL MISSION BRIEF",
        "",
        missionName,
        "",
        ...rows.map(([label, value]) => `${label}: ${value}`),
        "",
        model.note,
        "No booking, payment, or email was sent.",
      ].join("\n");
      download.addEventListener("click", () => downloadBrief(briefText, missionName));
      const reset = element("button", "btn btn-outline", "Plan another mission ↗");
      reset.type = "button";
      reset.id = "new-mission";
      reset.addEventListener("click", () => {
        submitButton.disabled = false;
        if (window.jQuery) {
          window.jQuery(success).stop(true, true).hide();
        }
        success.hidden = true;
        success.replaceChildren();
        form.scrollIntoView({
          behavior: reduceMotion.matches ? "auto" : "smooth",
          block: "start",
        });
        controls.missionName.focus({ preventScroll: true });
      });
      actions.append(download, reset);
      success.replaceChildren(eyebrow, heading, description, facts, disclaimer, actions);
      success.hidden = false;
      if (window.jQuery) {
        const successPanel = window.jQuery(success).stop(true, true).hide();
        clearingForm = true;
        successPanel.fadeIn(reduceMotion.matches ? 0 : 250, () => {
          success.focus({ preventScroll: true });
          clearingForm = false;
        });
      } else {
        success.style.display = "";
        success.focus({ preventScroll: true });
        clearingForm = false;
      }
      success.scrollIntoView({
        behavior: reduceMotion.matches ? "auto" : "smooth",
        block: "nearest",
      });
    }

    for (const [key, control] of Object.entries(controls)) {
      control.addEventListener("blur", () => {
        if (clearingForm) {
          return;
        }
        touched.add(key);
        showValidation(key);
      });
      control.addEventListener("input", () => {
        submitButton.disabled = false;
        if (touched.has(key)) {
          showValidation(key);
        }
        updateEstimate();
      });
      control.addEventListener("change", () => {
        submitButton.disabled = false;
        touched.add(key);
        showValidation(key);
        if (key === "vehicle" || key === "destination") {
          if (touched.has("payload")) {
            showValidation("payload");
          }
        }
        updateEstimate();
      });
    }
    controls.launchDate.addEventListener("focus", refreshMinimumDate);

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      if (submitButton.disabled) {
        return;
      }
      refreshMinimumDate();
      let firstInvalid = null;
      for (const key of Object.keys(controls)) {
        touched.add(key);
        if (!showValidation(key) && !firstInvalid) {
          firstInvalid = controls[key];
        }
      }
      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }
      const configuration = selectedConfiguration();
      const missionName = controls.missionName.value.trim();
      const commanderName = controls.commanderName.value.trim();
      const launchDate = controls.launchDate.value;
      clearingForm = true;
      submitButton.disabled = true;
      form.reset();
      touched.clear();
      for (const key of Object.keys(controls)) {
        showValidation(key);
      }
      updateEstimate();
      renderBrief(configuration, missionName, commanderName, launchDate);
    });

    updateEstimate();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeLaunchLab);
  } else {
    initializeLaunchLab();
  }
})();
