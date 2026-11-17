/*
 * Demo accounts: Sign Up and Log In on account.html, the crew profile on
 * profile.html. Data is read and written only through window.MissionStore.
 */
(() => {
  "use strict";

  const store = window.MissionStore;
  if (!store) {
    return;
  }

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
  const NAME_PATTERN = /^[\p{L}][\p{L}\p{M} .’'-]*$/u;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const dateFormat = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  // Short form for the stat card, e.g. "$64.3M"; the full sum is in the mission log.
  const shortMoney = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  });

  const { element, firstName } = window.MissionUI;

  // Shows a message box under a form with a jQuery slide.
  function showMessage(box, text, type) {
    box.className = `form-message is-${type}`;
    box.textContent = text;
    if (window.jQuery) {
      const $box = window.jQuery(box).stop(true, true);
      if (box.hidden) {
        box.hidden = false;
        $box.hide().slideDown(220);
      }
    } else {
      box.hidden = false;
    }
  }

  function hideMessage(box) {
    if (box.hidden) {
      return;
    }
    if (window.jQuery) {
      window
        .jQuery(box)
        .stop(true, true)
        .slideUp(160, () => {
          box.hidden = true;
        });
    } else {
      box.hidden = true;
    }
  }

  /*
   * Live validation for one form.
   * rules: { inputId: (input) => "error text" or "" }
   * An error is shown under a field after the visitor leaves it once,
   * and for every field when the form is submitted.
   */
  function validateForm(form, rules, messageBox, onValid) {
    const touched = new Set();
    const controls = Object.keys(rules).map((id) => document.getElementById(id));

    function check(control) {
      const message = rules[control.id](control);
      const visible = touched.has(control.id) ? message : "";
      document.getElementById(`${control.id}-error`).textContent = visible;
      control.classList.toggle("is-invalid", Boolean(visible));
      if (visible) {
        control.setAttribute("aria-invalid", "true");
      } else {
        control.removeAttribute("aria-invalid");
      }
      return !message;
    }

    for (const control of controls) {
      control.addEventListener("blur", () => {
        touched.add(control.id);
        check(control);
      });
      control.addEventListener("input", () => {
        if (touched.has(control.id)) {
          check(control);
        }
        hideMessage(messageBox);
      });
      control.addEventListener("change", () => {
        touched.add(control.id);
        check(control);
      });
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      let firstInvalid = null;
      for (const control of controls) {
        touched.add(control.id);
        if (!check(control) && !firstInvalid) {
          firstInvalid = control;
        }
      }
      if (firstInvalid) {
        hideMessage(messageBox);
        firstInvalid.focus();
        return;
      }
      onValid();
    });

    return {
      recheck(id) {
        const control = document.getElementById(id);
        if (touched.has(id)) {
          check(control);
        }
      },
      reset() {
        form.reset();
        touched.clear();
        controls.forEach(check);
      },
    };
  }

  /* ---------- account.html ---------- */

  function initAccountPage() {
    const loginForm = document.querySelector("#login-form");
    const signupForm = document.querySelector("#signup-form");
    if (!loginForm || !signupForm) {
      return;
    }
    const loginMessage = document.querySelector("#login-message");
    const signupMessage = document.querySelector("#signup-message");
    const loginButton = loginForm.querySelector('button[type="submit"]');
    const sessionNote = document.querySelector("#session-note");

    function renderSessionNote() {
      const user = store.currentUser();
      sessionNote.hidden = !user;
      if (!user) {
        sessionNote.replaceChildren();
        return;
      }
      const text = element("p", "", `You are logged in as ${user.name} (${user.email}).`);
      const profile = element("a", "btn btn-accent", "Open my profile ↗");
      profile.href = "profile.html";
      const logout = element("button", "btn btn-outline", "Log out");
      logout.type = "button";
      logout.addEventListener("click", () => {
        store.logOut();
        renderSessionNote();
        window.MissionUI?.toast("You have logged out. See you on the next launch.");
        document.querySelector("#login-email").focus();
      });
      const actions = element("div", "session-actions");
      actions.append(profile, logout);
      sessionNote.replaceChildren(text, actions);
    }

    const login = validateForm(
      loginForm,
      {
        "login-email": (input) => {
          const value = input.value.trim();
          if (!value) {
            return "Enter the email you signed up with.";
          }
          return EMAIL_PATTERN.test(value)
            ? ""
            : "Enter an email address like you@example.com.";
        },
        "login-password": (input) => (input.value ? "" : "Enter your password."),
      },
      loginMessage,
      () => {
        const email = document.querySelector("#login-email").value;
        const password = document.querySelector("#login-password").value;
        if (!store.findUser(email)) {
          showMessage(
            loginMessage,
            "There is no crew account with this email yet. Create one in the Sign Up form.",
            "error",
          );
          return;
        }
        const user = store.checkLogin(email, password);
        if (!user) {
          showMessage(
            loginMessage,
            "The password is incorrect. Please try again.",
            "error",
          );
          const passwordField = document.querySelector("#login-password");
          passwordField.select();
          passwordField.focus();
          return;
        }
        store.logIn(user.email);
        loginButton.disabled = true;
        showMessage(
          loginMessage,
          `Welcome back, ${firstName(user.name)}! Opening your crew profile…`,
          "success",
        );
        window.setTimeout(
          () => {
            window.location.href = "profile.html";
          },
          reduceMotion.matches ? 300 : 1100,
        );
      },
    );

    const signup = validateForm(
      signupForm,
      {
        "signup-name": (input) => {
          const value = input.value.trim();
          if (!value) {
            return "Enter your name.";
          }
          if (
            value.length > 60 ||
            !NAME_PATTERN.test(value) ||
            (value.match(/\p{L}/gu) || []).length < 2
          ) {
            return "Use at least two letters. Spaces, apostrophes, and hyphens are allowed.";
          }
          return "";
        },
        "signup-email": (input) => {
          const value = input.value.trim();
          if (!value) {
            return "Enter your email address.";
          }
          if (!EMAIL_PATTERN.test(value)) {
            return "Enter an email address like you@example.com.";
          }
          return store.findUser(value)
            ? "This email already has an account. Log in on the left instead."
            : "";
        },
        "signup-password": (input) => {
          const value = input.value;
          if (!value) {
            return "Create a password.";
          }
          if (value.length < 8 || !/\p{L}/u.test(value) || !/\d/.test(value)) {
            return "Use at least 8 characters with at least one letter and one number.";
          }
          return "";
        },
        "signup-confirm": (input) => {
          if (!input.value) {
            return "Repeat your password.";
          }
          return input.value === document.querySelector("#signup-password").value
            ? ""
            : "The passwords do not match.";
        },
        "signup-destination": (input) =>
          input.value ? "" : "Choose your dream destination.",
        "signup-consent": (input) =>
          input.checked ? "" : "Please confirm that you will not use a real password.",
      },
      signupMessage,
      () => {
        const user = store.createUser({
          name: document.querySelector("#signup-name").value,
          email: document.querySelector("#signup-email").value,
          password: document.querySelector("#signup-password").value,
          destination: document.querySelector("#signup-destination").value,
        });
        if (!user) {
          showMessage(
            signupMessage,
            "Your browser blocked saving the account. Allow site data and try again.",
            "error",
          );
          return;
        }
        signup.reset();
        showMessage(
          signupMessage,
          `Account created for ${user.name}. Log in with ${user.email} to open your profile.`,
          "success",
        );
        // Prepare the login form so the next step is one password away.
        const loginEmail = document.querySelector("#login-email");
        loginEmail.value = user.email;
        login.recheck("login-email");
        document.querySelector("#login-password").focus();
      },
    );

    // The repeated password is checked again when the first one changes.
    document
      .querySelector("#signup-password")
      .addEventListener("input", () => signup.recheck("signup-confirm"));

    renderSessionNote();
  }

  /* ---------- profile.html ---------- */

  // A short ID calculated from the email address, e.g. "MH-4F2A".
  function crewId(email) {
    let hash = 0;
    for (const character of email) {
      hash = (Math.imul(hash, 31) + character.charCodeAt(0)) >>> 0;
    }
    return `MH-${hash.toString(16).toUpperCase().padStart(4, "0").slice(-4)}`;
  }

  function initProfilePage() {
    const root = document.querySelector("#profile-root");
    if (!root) {
      return;
    }
    const message = document.querySelector("#profile-message");

    function definition(list, label, value) {
      const group = element("div");
      group.append(element("dt", "", label), element("dd", "", value));
      list.append(group);
    }

    function stat(label, value, note) {
      const column = element("div", "col-6 col-xl-4");
      const card = element("div", "stat-card");
      card.append(element("p", "stat-label", label), element("p", "stat-value", value));
      if (note) {
        card.append(element("p", "stat-note", note));
      }
      column.append(card);
      return column;
    }

    function renderGuest() {
      const panel = element("div", "empty-state profile-guest");
      const icon = element("span", "", "◎");
      icon.setAttribute("aria-hidden", "true");
      const login = element("a", "btn btn-accent", "Log in or sign up ↗");
      login.href = "account.html";
      panel.append(
        icon,
        element("h2", "", "You are not logged in."),
        element(
          "p",
          "",
          "Log in or create a demo account to see your crew profile. Your mission log works without an account.",
        ),
        login,
      );
      root.replaceChildren(panel);
    }

    function renderProfile(user) {
      const saved = store.getSaved();
      const missions = saved.filter((item) => item.type === "mission").length;
      const vehicles = saved.filter((item) => item.type === "vehicle").length;
      const briefs = store.getBriefs().length;
      const quiz = store.getQuiz();
      const session = store.getSession() || {};

      const card = element("article", "profile-card");
      const avatar = element(
        "div",
        "profile-avatar",
        firstName(user.name).charAt(0).toUpperCase(),
      );
      avatar.setAttribute("aria-hidden", "true");
      const details = element("dl", "profile-details");
      definition(details, "Email", user.email);
      definition(details, "Dream destination", user.destination || "Not chosen");
      definition(details, "Member since", dateFormat.format(new Date(user.joined)));
      if (session.since) {
        definition(details, "Logged in", dateFormat.format(new Date(session.since)));
      }
      const logout = element("button", "btn btn-outline full-button", "Log out");
      logout.type = "button";
      logout.id = "logout-button";
      logout.addEventListener("click", () => {
        store.logOut();
        render();
        showMessage(
          message,
          "You have logged out. Your saved items stay on this device.",
          "success",
        );
        message.focus();
      });
      card.append(
        avatar,
        element("p", "eyebrow", `CREW MEMBER · ${crewId(user.email)}`),
        element("h2", "profile-name", user.name),
        details,
        logout,
      );

      const summary = element("section", "profile-summary");
      summary.setAttribute("aria-labelledby", "summary-title");
      const title = element("h2", "profile-subtitle", "Your mission log at a glance.");
      title.id = "summary-title";
      const stats = element("div", "row g-3");
      stats.append(
        stat("Saved missions", String(missions)),
        stat("Saved vehicles", String(vehicles)),
        stat("Mission briefs", String(briefs)),
        stat(
          "Total fictional budget",
          shortMoney.format(store.briefsTotal()),
          "Sum of all saved briefs",
        ),
        stat(
          "Best quiz score",
          quiz.best === null ? "—" : `${quiz.best} / ${quiz.total}`,
          quiz.attempts
            ? `${quiz.attempts} ${quiz.attempts === 1 ? "attempt" : "attempts"}`
            : "Not taken yet",
        ),
        stat("Total saved", String(store.savedCount()), "Shown in the menu"),
      );
      const actions = element("div", "profile-actions");
      const log = element("a", "btn btn-accent", "Open my mission log ↗");
      log.href = "saved.html";
      const plan = element("a", "btn btn-outline", "Plan a mission");
      plan.href = "launch-lab.html";
      const quizLink = element("a", "text-link", "Take the space quiz ↗");
      quizLink.href = "future.html#space-quiz";
      actions.append(log, plan, quizLink);
      summary.append(title, stats, actions);

      const layout = element("div", "row g-4 align-items-start");
      const left = element("div", "col-lg-5");
      const right = element("div", "col-lg-7");
      left.append(card);
      right.append(summary);
      layout.append(left, right);
      root.replaceChildren(layout);
    }

    function render() {
      const user = store.currentUser();
      if (user) {
        renderProfile(user);
      } else {
        renderGuest();
      }
    }

    message.tabIndex = -1;
    render();
    // Keeps the numbers right if the visitor saves something in another tab.
    window.addEventListener("storage", (event) => {
      if (event.key && event.key.startsWith("missionHub.")) {
        render();
      }
    });
  }

  initAccountPage();
  initProfilePage();
})();
