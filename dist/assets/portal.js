"use strict";

import "./app.js?v=photos3";

const portal = (() => {
  const app = window.BrasaApp;
  const $ = id => document.getElementById(id);
  const emailPattern = /^[^@\s]{1,64}@[^@\s]{1,190}\.[^@\s]{2,}$/;
  const registrationFields = {
    name: "registerName",
    email: "registerEmail",
    phone: "registerPhone",
    password: "registerPassword",
    password_confirm: "registerConfirm"
  };
  const money = amount => `${new Intl.NumberFormat("uk-UA").format(amount)} ₴`;
  const statusNames = { pending: "Очікує", new: "Нове", confirmed: "Підтверджено", completed: "Виконано", cancelled: "Скасовано" };
  let user = null;
  let ready = false;

  async function api(path, options = {}) {
    let response;
    try {
      response = await fetch(path, {
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        ...options,
        body: options.body === undefined ? undefined : JSON.stringify(options.body)
      });
    } catch {
      throw new Error("Сервер недоступний. Запустіть сайт через server.py.");
    }
    let data;
    try { data = await response.json(); } catch { throw new Error("Сервер повернув некоректну відповідь."); }
    if (!response.ok) {
      const issue = new Error(data.error || "Не вдалося виконати дію.");
      issue.field = data.field;
      throw issue;
    }
    return data;
  }

  function error(id, message) {
    const node = $(id);
    node.textContent = message;
    node.hidden = !message;
  }

  function text(tag, content, className = "") {
    const node = document.createElement(tag);
    node.textContent = content;
    if (className) node.className = className;
    return node;
  }

  function dateLabel(value) {
    const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" });
  }

  function setPasswordVisibility(button, visible) {
    $(button.getAttribute("aria-controls")).type = visible ? "text" : "password";
    button.setAttribute("aria-pressed", String(visible));
  }

  function hideAuthPasswords() {
    for (const button of document.querySelectorAll('.auth-form .password-toggle[aria-pressed="true"]')) {
      setPasswordVisibility(button, false);
    }
  }

  function showAuthTab(which) {
    const login = which === "login";
    $("loginForm").hidden = !login;
    $("registerForm").hidden = login;
    hideAuthPasswords();
    for (const [id, selected] of [["loginTab", login], ["registerTab", !login]]) {
      $(id).classList.toggle("is-active", selected);
      $(id).setAttribute("aria-selected", String(selected));
    }
  }

  function updateRoleUI() {
    const signedIn = !!user;
    app.setManagerMode(!!user && user.role === "manager");
    document.querySelectorAll("[data-guest-only]").forEach(node => { node.hidden = signedIn; });
    document.querySelectorAll("[data-user-only]").forEach(node => { node.hidden = !signedIn; });
    document.querySelectorAll("[data-manager-only]").forEach(node => { node.hidden = !user || user.role !== "manager"; });
    $("authGuest").hidden = signedIn;
    $("authProfile").hidden = !signedIn;
    $("reviewForm").hidden = !user || user.role !== "user";
    $("reviewGuestMessage").hidden = !!user && user.role === "user";
    $("reviewLoginLink").hidden = signedIn;
    if (user) {
      $("profileName").textContent = user.name;
      $("profileEmail").textContent = user.email;
      $("profileRole").textContent = user.role === "manager" ? "Менеджер" : "Зареєстрований користувач";
      $("bookingName").value ||= user.name;
      $("bookingPhone").value ||= user.phone;
      $("checkoutName").value ||= user.name;
      $("checkoutPhone").value ||= user.phone;
      if (user.role === "manager") $("reviewGuestMessage").textContent = "Менеджер відповідає на відгуки в панелі керування.";
    } else {
      $("reviewGuestMessage").textContent = "Щоб написати відгук, увійдіть до облікового запису.";
    }
  }

  function validateLogin(data) {
    const email = String(data.email || "").trim();
    if (!emailPattern.test(email) || email.length > 254) return "Вкажіть коректну електронну пошту.";
    if (!data.password) return "Вкажіть пароль.";
    if (data.password.length > 128) return "Пароль може містити до 128 символів.";
    return "";
  }

  function registrationPhoneDigits(value) {
    const raw = value.trim();
    if (!/^\+?[0-9 ()-]*$/.test(raw)) return null;
    const digits = raw.replace(/\D/g, "");
    if (raw.startsWith("+")) return digits.startsWith("380") ? digits.slice(3) : null;
    if (!raw.startsWith("(") && digits.length === 12 && digits.startsWith("380")) return digits.slice(3);
    if (digits.startsWith("0") && (!raw.startsWith("(") || digits.length === 10)) return digits.slice(1);
    return digits;
  }

  function maskRegistrationPhone(input, inputType) {
    const raw = input.value;
    const digits = registrationPhoneDigits(raw);
    if (digits === null || digits.length > 9) return;

    let formatted = digits ? "(" + digits.slice(0, 2) : "";
    if (digits.length > 2) formatted += ") " + digits.slice(2, 5);
    if (digits.length > 5) formatted += "-" + digits.slice(5, 7);
    if (digits.length > 7) formatted += "-" + digits.slice(7);
    if (raw === formatted) return;

    const cursor = input.selectionStart ?? raw.length;
    const removedPrefix = raw.replace(/\D/g, "").length - digits.length;
    let digitsBefore = Math.max(0, raw.slice(0, cursor).replace(/\D/g, "").length - removedPrefix);
    let position = 0;
    while (digitsBefore > 0 && position < formatted.length) {
      if (/\d/.test(formatted[position])) digitsBefore--;
      position++;
    }
    if (inputType === "deleteContentForward") {
      while (position < formatted.length && /\D/.test(formatted[position])) position++;
    }
    input.value = formatted;
    input.setSelectionRange(position, position);
  }

  function registrationProblems(data) {
    const problems = {};
    const name = data.name.trim();
    const email = data.email.trim();
    const phone = registrationPhoneDigits(data.phone);

    if (!name) problems.name = "Введіть ім’я.";
    else if ([...name].length < 2 || [...name].length > 80) problems.name = "Ім’я має містити від 2 до 80 символів.";
    else if (!/^[\p{L}\p{M} '’ʼ-]+$/u.test(name) || !/\p{L}/u.test(name)) {
      problems.name = "Використовуйте лише літери, пробіли, дефіс і апостроф.";
    }

    if (!email) problems.email = "Введіть електронну пошту.";
    else if (!emailPattern.test(email) || email.length > 254) problems.email = "Введіть адресу у форматі name@example.com без пробілів.";

    if (!data.phone.trim()) problems.phone = "Введіть номер телефону.";
    else if (!phone || !/^[1-9][0-9]{8}$/.test(phone)) problems.phone = "Введіть 9 цифр після +380 без початкового 0. Наприклад, (67) 123-45-67.";

    if (!data.password) problems.password = "Введіть пароль.";
    else if ([...data.password].length < 8 || [...data.password].length > 128) problems.password = "Пароль має містити від 8 до 128 символів.";
    else if (!/\p{L}/u.test(data.password) || !/[0-9]/.test(data.password)) {
      problems.password = "Додайте щонайменше одну літеру й одну цифру від 0 до 9.";
    }

    if (!data.password_confirm) problems.password_confirm = "Введіть пароль ще раз.";
    else if (data.password_confirm !== data.password) problems.password_confirm = "Паролі не збігаються. Перевірте регістр літер і пробіли.";
    return problems;
  }

  function showRegistrationError(field, message) {
    const id = registrationFields[field];
    const input = $(id);
    error(id + "Error", message || "");
    if (message) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
  }

  async function submitAuth(formId, register) {
    const form = $(formId);
    const data = Object.fromEntries(new FormData(form));
    const errorId = register ? "registerError" : "loginError";
    error(errorId, "");
    if (register) {
      const problems = registrationProblems(data);
      const fields = Object.keys(registrationFields);
      for (const field of fields) showRegistrationError(field, problems[field]);
      const firstInvalid = fields.find(field => problems[field]);
      if (firstInvalid) {
        $(registrationFields[firstInvalid]).focus();
        return;
      }
      data.phone = "+380" + registrationPhoneDigits(data.phone);
    } else {
      const problem = validateLogin(data);
      if (problem) { error(errorId, problem); return; }
    }
    try {
      const result = await api(register ? "/api/register" : "/api/login", { method: "POST", body: data });
      user = result.user;
      ready = true;
      form.reset();
      updateRoleUI();
      location.hash = "account";
      app.setView("account");
      app.showToast(register ? "Обліковий запис створено." : "Ви увійшли до облікового запису.");
      await loadProfile();
      await loadReviews();
    } catch (cause) {
      if (register && Object.hasOwn(registrationFields, cause.field)) {
        showRegistrationError(cause.field, cause.message);
        $(registrationFields[cause.field]).focus();
      } else {
        error(errorId, cause.message);
      }
    }
  }

  async function loadProfile() {
    if (!user) return;
    try {
      const [bookings, orders] = await Promise.all([api("/api/my/bookings"), api("/api/my/orders")]);
      renderMyRecords("myBookings", bookings.bookings, row => `${dateLabel(row.visit_date)} о ${row.visit_time}, ${row.guests} гостей`, "Ще немає бронювань.");
      renderMyRecords("myOrders", orders.orders, row => `Замовлення №${row.id}, ${money(row.total_uah)}`, "Ще немає замовлень.");
    } catch (cause) {
      $("myBookings").replaceChildren(text("p", cause.message, "subtle-text"));
      $("myOrders").replaceChildren();
    }
  }

  function renderMyRecords(id, rows, describe, empty) {
    const target = $(id);
    target.replaceChildren();
    if (!rows.length) { target.append(text("p", empty, "subtle-text")); return; }
    for (const row of rows) {
      const card = document.createElement("article");
      card.className = "record-card";
      card.append(text("strong", describe(row)), text("span", statusNames[row.status] || row.status, `status-badge status-${row.status}`));
      target.append(card);
    }
  }

  function makeReviewCard(review) {
    const card = document.createElement("article");
    card.className = "review-card";
    const head = document.createElement("div");
    head.className = "review-head";
    head.append(text("strong", review.author), text("span", "★".repeat(review.rating), "review-stars"));
    card.append(head, text("time", dateLabel(review.created_at), "review-date"), text("p", review.body, "review-body"));
    if (review.manager_reply) {
      const reply = document.createElement("div");
      reply.className = "manager-reply";
      reply.append(text("strong", "Відповідь менеджера"), text("p", review.manager_reply));
      card.append(reply);
    }
    const comments = document.createElement("div");
    comments.className = "review-comments";
    comments.append(text("h4", `Коментарі (${review.comments.length})`));
    for (const comment of review.comments) {
      const line = document.createElement("p");
      line.append(text("strong", `${comment.author}${comment.role === "manager" ? " (менеджер)" : ""}: `), document.createTextNode(comment.body));
      comments.append(line);
    }
    if (user) {
      const form = document.createElement("form");
      form.className = "comment-form";
      form.dataset.reviewId = review.id;
      const input = document.createElement("input");
      input.name = "body";
      input.type = "text";
      input.placeholder = "Напишіть коментар";
      input.minLength = 2;
      input.maxLength = 500;
      input.required = true;
      input.setAttribute("aria-label", `Коментар до відгуку ${review.author}`);
      const button = text("button", "Надіслати");
      button.type = "submit";
      form.append(input, button);
      comments.append(form);
    }
    card.append(comments);
    return card;
  }

  async function loadReviews() {
    const target = $("reviewsList");
    try {
      const result = await api("/api/reviews");
      target.replaceChildren();
      if (!result.reviews.length) target.append(text("p", "Поки що відгуків немає. Станьте першим гостем, який поділиться враженнями.", "subtle-text"));
      else target.append(...result.reviews.map(makeReviewCard));
    } catch (cause) { target.replaceChildren(text("p", cause.message, "subtle-text")); }
  }

  async function submitReview() {
    const rating = Number($("reviewRating").value);
    const body = $("reviewBody").value.trim();
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return error("reviewError", "Оберіть оцінку від 1 до 5.");
    if (body.length < 10 || body.length > 1000) return error("reviewError", "Відгук має містити від 10 до 1000 символів.");
    error("reviewError", "");
    try {
      await api("/api/reviews", { method: "POST", body: { rating, body } });
      $("reviewForm").reset();
      await loadReviews();
      app.showToast("Відгук опубліковано.");
    } catch (cause) { error("reviewError", cause.message); }
  }

  async function submitBooking() {
    const form = $("bookingForm");
    const data = Object.fromEntries(new FormData(form));
    const required = ["date", "time", "guests", "name", "phone"];
    if (required.some(key => !String(data[key] || "").trim())) return error("bookingError", "Заповніть усі обов’язкові поля.");
    if (data.date < $("bookingDate").min) return error("bookingError", "Оберіть сьогоднішню або майбутню дату.");
    if (String(data.name).trim().length < 2 || String(data.name).trim().length > 80) return error("bookingError", "Вкажіть ім’я від 2 до 80 символів.");
    if (!app.validPhone(data.phone)) return error("bookingError", "Вкажіть коректний номер телефону.");
    if (String(data.comment || "").length > 500) return error("bookingError", "Побажання може містити до 500 символів.");
    if (!user) {
      error("bookingError", "Увійдіть, щоб зберегти бронювання.");
      app.showToast("Спочатку увійдіть до облікового запису.");
      return;
    }
    error("bookingError", "");
    try {
      const result = await api("/api/bookings", { method: "POST", body: data });
      $("bookingSummary").textContent = `Заявка №${result.id}: ${dateLabel(data.date)} о ${data.time}, ${data.guests} гостей. Статус: очікує підтвердження менеджера.`;
      form.hidden = true;
      $("bookingSuccess").hidden = false;
      await loadProfile();
    } catch (cause) { error("bookingError", cause.message); }
  }

  async function submitCheckout() {
    const items = app.getCartItems();
    const name = $("checkoutName").value.trim();
    const phone = $("checkoutPhone").value.trim();
    if (!items.length) return error("checkoutError", "Спочатку додайте страви до кошика.");
    if (name.length < 2 || name.length > 80) return error("checkoutError", "Вкажіть ім’я від 2 до 80 символів.");
    if (!app.validPhone(phone)) return error("checkoutError", "Вкажіть коректний номер телефону.");
    if (!user) return error("checkoutError", "Увійдіть до облікового запису, щоб оформити замовлення.");
    error("checkoutError", "");
    try {
      const result = await api("/api/orders", { method: "POST", body: { name, phone, items } });
      app.clearCart();
      app.closeCart();
      $("checkoutForm").reset();
      app.showToast(`Замовлення №${result.id} збережено. Сума: ${money(result.total_uah)}.`);
      await loadProfile();
    } catch (cause) { error("checkoutError", cause.message); }
  }

  function makeStatusSelect(table, record) {
    const select = document.createElement("select");
    select.className = "status-select";
    select.setAttribute("aria-label", `Статус запису №${record.id}`);
    select.dataset.table = table;
    select.dataset.recordId = record.id;
    const choices = table === "bookings" ? ["pending", "confirmed", "cancelled"] : ["new", "confirmed", "completed", "cancelled"];
    for (const value of choices) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = statusNames[value];
      select.append(option);
    }
    select.value = record.status;
    return select;
  }

  function renderManagerRecords(id, rows, describe, table) {
    const target = $(id);
    target.replaceChildren();
    if (!rows.length) { target.append(text("p", "Записів поки немає.", "subtle-text")); return; }
    for (const row of rows) {
      const card = document.createElement("article");
      card.className = "record-card manager-record";
      card.append(text("strong", describe(row)), text("small", `${row.customer_name || row.guest_name} · ${row.phone} · ${row.email}`));
      if (table === "orders") card.append(text("small", row.items.map(item => `${item.dish_name} × ${item.quantity}`).join(", ")));
      if (table === "bookings" && row.note) card.append(text("small", `Побажання: ${row.note}`));
      card.append(makeStatusSelect(table, row));
      target.append(card);
    }
  }

  function renderManagerReviews(reviews) {
    const target = $("managerReviews");
    target.replaceChildren();
    if (!reviews.length) { target.append(text("p", "Відгуків поки немає.", "subtle-text")); return; }
    for (const review of reviews) {
      const card = document.createElement("article");
      card.className = "record-card manager-review";
      card.append(text("strong", `${review.author} · ${"★".repeat(review.rating)}`), text("p", review.body));
      const visibility = text("button", review.is_visible ? "Приховати" : "Показати", "text-button");
      visibility.type = "button";
      visibility.dataset.visibilityId = review.id;
      visibility.dataset.visible = review.is_visible ? "false" : "true";
      card.append(visibility);
      const form = document.createElement("form");
      form.className = "manager-reply-form";
      form.dataset.replyId = review.id;
      const input = document.createElement("input");
      input.name = "reply";
      input.type = "text";
      input.minLength = 2;
      input.maxLength = 500;
      input.required = true;
      input.placeholder = "Відповідь менеджера";
      input.value = review.manager_reply || "";
      input.setAttribute("aria-label", `Відповідь на відгук ${review.author}`);
      const button = text("button", "Зберегти відповідь");
      button.type = "submit";
      form.append(input, button);
      card.append(form);
      target.append(card);
    }
  }

  async function loadManager() {
    if (!user || user.role !== "manager") return;
    try {
      const data = await api("/api/manager/overview");
      error("managerError", "");
      $("managerStats").replaceChildren(
        text("span", `Користувачів: ${data.users_count}`),
        text("span", `Бронювань: ${data.bookings.length}`),
        text("span", `Замовлень: ${data.orders.length}`),
        text("span", `Відгуків: ${data.reviews.length}`)
      );
      renderManagerRecords("managerBookings", data.bookings, row => `№${row.id}: ${dateLabel(row.visit_date)} о ${row.visit_time}, ${row.guests} гостей`, "bookings");
      renderManagerRecords("managerOrders", data.orders, row => `№${row.id}: ${money(row.total_uah)}`, "orders");
      renderManagerReviews(data.reviews);
    } catch (cause) { error("managerError", cause.message); }
  }

  function onView(view) {
    if (!ready) return;
    if (view === "manager" && (!user || user.role !== "manager")) {
      location.hash = "account";
      app.setView("account");
      return;
    }
    if (view === "reviews") loadReviews();
    if (view === "account") loadProfile();
    if (view === "manager") loadManager();
  }

  function bindEvents() {
    $("loginTab").addEventListener("click", () => showAuthTab("login"));
    $("registerTab").addEventListener("click", () => showAuthTab("register"));
    $("loginForm").addEventListener("submit", event => { event.preventDefault(); submitAuth("loginForm", false); });
    const registerForm = $("registerForm");
    for (const button of document.querySelectorAll(".auth-form .password-toggle")) {
      button.addEventListener("click", () => {
        setPasswordVisibility(button, button.getAttribute("aria-pressed") === "false");
      });
      button.hidden = false;
    }
    $("loginForm").addEventListener("reset", hideAuthPasswords);
    registerForm.addEventListener("reset", hideAuthPasswords);
    registerForm.addEventListener("submit", event => { event.preventDefault(); submitAuth("registerForm", true); });
    registerForm.addEventListener("focusout", event => {
      const field = event.target.name;
      if (!Object.hasOwn(registrationFields, field)) return;
      const problems = registrationProblems(Object.fromEntries(new FormData(registerForm)));
      showRegistrationError(field, problems[field]);
    });
    registerForm.addEventListener("input", event => {
      const input = event.target;
      const field = input.name;
      if (!Object.hasOwn(registrationFields, field)) return;
      if (field === "phone") maskRegistrationPhone(input, event.inputType);
      const data = Object.fromEntries(new FormData(registerForm));
      const problems = registrationProblems(data);
      if (input.hasAttribute("aria-invalid")) showRegistrationError(field, problems[field]);
      if (field === "password" && data.password_confirm) {
        showRegistrationError("password_confirm", problems.password_confirm);
      }
    });
    $("logoutButton").addEventListener("click", async () => {
      try {
        await api("/api/logout", { method: "POST", body: {} });
        user = null;
        updateRoleUI();
        showAuthTab("login");
        $("bookingName").value = "";
        $("bookingPhone").value = "";
        $("checkoutName").value = "";
        $("checkoutPhone").value = "";
        location.hash = "account";
        app.setView("account");
        app.showToast("Ви вийшли з облікового запису.");
      } catch (cause) { app.showToast(cause.message); }
    });
    $("bookingDate").min = app.localDateString(new Date());
    $("bookingForm").addEventListener("submit", event => { event.preventDefault(); submitBooking(); });
    $("newBooking").addEventListener("click", () => {
      $("bookingForm").reset();
      $("bookingSuccess").hidden = true;
      $("bookingForm").hidden = false;
      if (user) { $("bookingName").value = user.name; $("bookingPhone").value = user.phone; }
      $("bookingDate").focus();
    });
    $("checkoutForm").addEventListener("submit", event => { event.preventDefault(); submitCheckout(); });
    $("reviewForm").addEventListener("submit", event => { event.preventDefault(); submitReview(); });
    $("reviewsList").addEventListener("submit", async event => {
      const form = event.target.closest("[data-review-id]");
      if (!form) return;
      event.preventDefault();
      const body = form.elements.body.value.trim();
      if (body.length < 2 || body.length > 500) return app.showToast("Коментар має містити від 2 до 500 символів.");
      try {
        await api(`/api/reviews/${form.dataset.reviewId}/comments`, { method: "POST", body: { body } });
        await loadReviews();
        app.showToast("Коментар додано.");
      } catch (cause) { app.showToast(cause.message); }
    });
    $("managerBookings").addEventListener("change", changeManagerStatus);
    $("managerOrders").addEventListener("change", changeManagerStatus);
    $("managerReviews").addEventListener("click", async event => {
      const button = event.target.closest("[data-visibility-id]");
      if (!button) return;
      try {
        await api(`/api/manager/reviews/${button.dataset.visibilityId}/visibility`, { method: "POST", body: { visible: button.dataset.visible === "true" } });
        await loadManager();
        await loadReviews();
      } catch (cause) { error("managerError", cause.message); }
    });
    $("managerReviews").addEventListener("submit", async event => {
      const form = event.target.closest("[data-reply-id]");
      if (!form) return;
      event.preventDefault();
      const reply = form.elements.reply.value.trim();
      if (reply.length < 2 || reply.length > 500) return error("managerError", "Відповідь має містити від 2 до 500 символів.");
      try {
        await api(`/api/manager/reviews/${form.dataset.replyId}/reply`, { method: "POST", body: { reply } });
        await loadManager();
        await loadReviews();
        app.showToast("Відповідь збережено.");
      } catch (cause) { error("managerError", cause.message); }
    });
  }

  async function changeManagerStatus(event) {
    const select = event.target.closest("[data-table]");
    if (!select) return;
    try {
      await api(`/api/manager/${select.dataset.table}/${select.dataset.recordId}/status`, { method: "POST", body: { status: select.value } });
      await loadManager();
      app.showToast("Статус оновлено.");
    } catch (cause) { await loadManager(); error("managerError", cause.message); }
  }

  async function init() {
    bindEvents();
    try { user = (await api("/api/me")).user; }
    catch { user = null; }
    ready = true;
    updateRoleUI();
    await loadReviews();
    onView(location.hash.slice(1).split("/")[0] || "home");
  }

  return { init, onView };
})();

window.BrasaPortal = portal;
portal.init();
