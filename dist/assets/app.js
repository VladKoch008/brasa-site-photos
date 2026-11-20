"use strict";

let dishes = [];
const categories = { starters: "Закуски", mains: "Основні", desserts: "Десерти", drinks: "Напої" };
let menuReady = false;
let menuRequest;
let managerMode = false;
let selectedDish = "";
let removalId = "";
let photoDishId = "";
const photoAtlas = {
  bruschetta: [0, "tomato basil bruschetta"],
  tartare: [1, "steak tartare capers"],
  salad: [2, "roasted beet salad walnuts"],
  steak: [3, "grilled steak vegetables"],
  pasta: [4, "creamy mushroom pasta"],
  salmon: [5, "salmon mashed potatoes"],
  cheesecake: [6, "cheesecake berry sauce"],
  fondant: [7, "chocolate lava cake ice cream"],
  lemonade: [8, "lemonade mint lemon"],
  "96ffcf50b2b3e429b7a56469": [9, "Ukrainian borscht sour cream"]
};

const validViews = new Set(["home", "menu", "booking", "order", "reviews", "contacts", "account", "manager"]);
const viewNames = { home: "Головна", menu: "Меню", booking: "Бронювання", order: "Замовити", reviews: "Відгуки", contacts: "Контакти", account: "Кабінет", manager: "Менеджер" };
const currency = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 2 });
const byId = id => document.getElementById(id);
const cartDialog = byId("cartDialog");
const mobileNav = byId("mobileNav");
const menuTrigger = byId("menuTrigger");
let filter = "all";
let toastTimer;

function readCart() {
  try {
    const saved = JSON.parse(localStorage.getItem("brasa-demo-cart") || "{}");
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return {};
    const cart = Object.create(null);
    for (const [id, value] of Object.entries(saved)) {
      const count = Number(value);
      if (Number.isInteger(count) && count > 0) cart[id] = Math.min(count, 99);
    }
    return cart;
  } catch { return {}; }
}

let cart = readCart();

function saveCart() {
  try { localStorage.setItem("brasa-demo-cart", JSON.stringify(cart)); } catch { /* Private browsing can block storage. */ }
  renderCart();
}

function money(value) { return `${currency.format(value)} ₴`; }
function escapeHTML(value) { return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]); }

function showToast(message) {
  const toast = byId("siteToast");
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3200);
}

function dishPhoto(dish) {
  if (dish.photo) {
    return `<div class="menu-photo"><img src="${escapeHTML(dish.photo.url)}" alt="" loading="lazy" decoding="async"></div>`;
  }
  const entry = Object.hasOwn(photoAtlas, dish.id) ? photoAtlas[dish.id] : null;
  if (entry) {
    const slot = entry[0];
    const x = (slot % 3) * 50;
    const y = Math.floor(slot / 3) * (100 / 3);
    return `<div class="menu-photo"><div class="menu-photo-atlas" style="--tile-x:${x}%;--tile-y:${y}%"></div></div>`;
  }
  return `<div class="menu-photo menu-photo-empty"><svg class="icon" aria-hidden="true"><use href="#icon-camera"/></svg><span>Фото ще немає</span></div>`;
}

function dishCard(dish, number) {
  const col = document.createElement("div");
  col.className = "col-md-6 col-xl-4";
  const name = escapeHTML(dish.name);
  const id = escapeHTML(dish.id);
  const managerTools = managerMode ? `
    <button class="dish-photo-button" type="button" data-edit-photo="${id}" aria-label="Фото страви: ${name}" title="Знайти або змінити фото"><svg class="icon" aria-hidden="true"><use href="#icon-camera"/></svg></button>
    <button class="remove-dish-button" type="button" data-remove-dish="${id}" aria-label="Прибрати ${name} з меню" title="Прибрати з меню"><svg class="icon" aria-hidden="true"><use href="#icon-minus"/></svg></button>` : "";
  const credit = dish.photo?.credit ? escapeHTML(dish.photo.credit) : "";
  const source = dish.photo?.source ? `<a href="${escapeHTML(dish.photo.source)}" target="_blank" rel="noopener noreferrer">Джерело фото ↗</a>` : "";
  col.innerHTML = `
    <article class="card menu-card${selectedDish === dish.id ? " is-selected" : ""}" data-dish-id="${id}" tabindex="-1">
      ${dishPhoto(dish)}
      <div class="menu-card-body">
        <div class="menu-card-top">
          <span>${escapeHTML(dish.categoryName)}</span>
          <div class="menu-card-tools"><span class="menu-card-number">${String(number).padStart(2, "0")}</span>${managerTools}</div>
        </div>
        <h3>${name}</h3>
        <p>${escapeHTML(dish.detail)}</p>
        ${credit || source ? `<small class="dish-photo-credit">${credit}${source}</small>` : ""}
        <div class="menu-card-bottom">
          <span class="menu-price">${money(dish.price)}</span>
          <button class="add-button" type="button" data-add="${id}" aria-label="Додати ${name} до кошика"><svg class="icon" aria-hidden="true"><use href="#icon-plus"/></svg> Додати</button>
        </div>
      </div>
    </article>`;
  return col;
}

function renderMenu() {
  const query = byId("menuSearch").value.trim().toLocaleLowerCase("uk-UA");
  const matches = dishes.filter(dish => {
    const searchText = `${dish.name} ${dish.detail} ${window.BrasaI18n.translate(dish.name)} ${window.BrasaI18n.translate(dish.detail)}`;
    return (filter === "all" || dish.category === filter) && searchText.toLocaleLowerCase().includes(query);
  });
  const grid = byId("menuGrid");
  grid.replaceChildren(...matches.map(dish => dishCard(dish, dishes.indexOf(dish) + 1)));
  byId("emptyResults").hidden = !menuReady || matches.length > 0;
  document.querySelectorAll("[data-filter]").forEach(button => {
    const active = button.dataset.filter === filter;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function renderOrder() {
  const featured = ["tartare", "steak", "pasta", "cheesecake"].map(id => dishes.find(dish => dish.id === id)).filter(Boolean);
  for (const dish of dishes) { if (featured.length >= 4) break; if (!featured.includes(dish)) featured.push(dish); }
  byId("orderGrid").replaceChildren(...featured.map((dish, index) => dishCard(dish, index + 1)));
}

function renderCart() {
  const count = dishes.reduce((sum, dish) => sum + (cart[dish.id] || 0), 0);
  const total = dishes.reduce((sum, dish) => sum + (cart[dish.id] || 0) * Math.round(dish.price * 100), 0) / 100;
  document.querySelectorAll(".cart-count, .inline-cart-count").forEach(node => { node.textContent = String(count); });
  byId("cartTotal").textContent = money(total);
  const content = byId("cartContent");
  const selected = dishes.filter(dish => cart[dish.id]);
  if (!selected.length) {
    content.innerHTML = `<p class="cart-empty">Ваш кошик поки порожній.<br>Оберіть щось смачне в меню.</p>`;
  } else {
    content.replaceChildren(...selected.map(dish => {
      const row = document.createElement("div");
      row.className = "cart-line";
      const name = escapeHTML(dish.name);
      row.innerHTML = `<div><h3>${name}</h3><small>${money(dish.price)} за порцію</small><div class="quantity-controls"><button type="button" data-quantity="-1" data-id="${dish.id}" aria-label="Зменшити кількість ${name}"><svg class="icon" aria-hidden="true"><use href="#icon-minus"/></svg></button><span>${cart[dish.id]}</span><button type="button" data-quantity="1" data-id="${dish.id}" aria-label="Збільшити кількість ${name}"><svg class="icon" aria-hidden="true"><use href="#icon-plus"/></svg></button></div></div><strong class="cart-line-price">${money(Math.round(dish.price * 100) * cart[dish.id] / 100)}</strong>`;
      return row;
    }));
  }
  byId("checkoutForm").querySelector("button[type=submit]").disabled = count === 0;
}

function setView(view) {
  const route = view.split("/");
  view = route[0];
  if (!validViews.has(view)) view = "home";
  if (view === "menu") {
    filter = Object.hasOwn(categories, route[1]) ? route[1] : "all";
    selectedDish = route[2] || "";
    renderMenu();
  }
  document.querySelectorAll("main .view").forEach(section => {
    section.hidden = section.id !== view;
    section.classList.toggle("is-active", section.id === view);
  });
  document.querySelectorAll("[data-view-link]").forEach(link => {
    const current = link.dataset.viewLink === view;
    link.classList.toggle("is-current", current);
    if (current) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  document.title = `${viewNames[view]} | Brasa з фото`;
  renderBreadcrumbs(view);
  closeNavigation();
  mobileNav.hidden = true;
  menuTrigger.setAttribute("aria-expanded", "false");
  window.scrollTo({ top: 0, behavior: "instant" });
  if (view === "menu") focusSelectedDish();
  window.BrasaPortal?.onView(view);
  if (view === "menu" || view === "order") refreshMenu();
}

function renderBreadcrumbs(view = location.hash.slice(1).split("/")[0] || "home") {
  const crumbs = byId("breadcrumbs");
  crumbs.hidden = view === "home";
  if (view !== "home") {
    crumbs.replaceChildren();
    const parts = [["Головна", "#home"], [viewNames[view] || "Головна", `#${view}`]];
    if (view === "menu" && filter !== "all") parts.push([categories[filter], `#menu/${filter}`]);
    const dish = dishes.find(item => item.id === selectedDish);
    if (view === "menu" && dish) parts.push([dish.name, `#menu/${dish.category}/${dish.id}`]);
    parts.forEach(([label, href], index) => {
      if (index) {
        const separator = document.createElement("span");
        separator.textContent = "/";
        separator.setAttribute("aria-hidden", "true");
        crumbs.append(separator);
      }
      const node = document.createElement(index === parts.length - 1 ? "span" : "a");
      node.textContent = label;
      if (node.tagName === "A") { node.href = href; node.dataset.menuRoute = ""; }
      else node.setAttribute("aria-current", "page");
      crumbs.append(node);
    });
  }
}

function focusSelectedDish() {
  requestAnimationFrame(() => {
    const card = [...byId("menuGrid").querySelectorAll("[data-dish-id]")].find(node => node.dataset.dishId === selectedDish);
    if (card) { card.scrollIntoView({ block: "nearest", behavior: "instant" }); card.focus({ preventScroll: true }); }
  });
}

function navigate(route) {
  if (location.hash === `#${route}`) setView(route);
  else location.hash = route;
}

function closeNavigation() {
  document.querySelectorAll(".nav-menu.is-open, .nav-category.is-open").forEach(node => {
    node.classList.remove("is-open");
    node.querySelector(":scope > .nav-menu-heading > a, :scope > .nav-category-heading > button")?.setAttribute("aria-expanded", "false");
  });
}

function bindDisclosure(node) {
  const button = node.querySelector(":scope > .nav-menu-heading > a, :scope > .nav-category-heading > button");
  const open = value => { node.classList.toggle("is-open", value); button.setAttribute("aria-expanded", String(value)); };
  let touchInput = false;
  button.addEventListener("pointerdown", event => { touchInput = event.pointerType === "touch" || event.pointerType === "pen"; });
  button.addEventListener("click", event => {
    if (button.tagName === "A") {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      if (!touchInput && !matchMedia("(hover: none)").matches) return;
      event.preventDefault();
      event.stopPropagation();
    }
    open(!node.classList.contains("is-open"));
  });
  node.addEventListener("pointerenter", event => { if (event.pointerType === "mouse") open(true); });
  node.addEventListener("pointerleave", event => { if (event.pointerType === "mouse" && !node.contains(document.activeElement)) open(false); });
  node.addEventListener("focusin", event => { if (!node.contains(event.relatedTarget) && event.target !== button) open(true); });
  node.addEventListener("focusout", event => { if (!node.contains(event.relatedTarget)) open(false); });
  node.addEventListener("keydown", event => {
    if (event.key === "Escape") { event.stopPropagation(); button.focus(); open(false); }
    if (event.key === "ArrowDown" && event.target === button) { event.preventDefault(); open(true); node.querySelector(node.classList.contains("nav-category") ? ".dish-submenu a" : ".nav-dropdown a")?.focus(); }
    if (event.key === " " && event.target === button && button.tagName === "A") { event.preventDefault(); open(!node.classList.contains("is-open")); }
  });
}

function renderMenuNavigation() {
  const dropdown = byId("menuDropdown");
  dropdown.innerHTML = '<a class="dropdown-all" href="#menu" data-menu-route>Усе меню <span>↗</span></a>';
  for (const [key, label] of Object.entries(categories)) {
    const items = dishes.filter(dish => dish.category === key);
    const node = document.createElement("div");
    node.className = "nav-category";
    node.innerHTML = `<div class="nav-category-heading"><a href="#menu/${key}" data-menu-route>${label}<small>${items.length}</small></a><button class="nav-disclosure" type="button" aria-label="Показати страви: ${label}" aria-expanded="false" aria-controls="submenu-${key}">›</button></div><div class="dish-submenu" id="submenu-${key}">${items.length ? items.map(dish => `<a href="#menu/${key}/${dish.id}" data-menu-route><span>${escapeHTML(dish.name)}</span><small>${money(dish.price)}</small></a>`).join("") : '<p class="dropdown-empty">У цій категорії поки немає страв.</p>'}</div>`;
    dropdown.append(node);
    bindDisclosure(node);
  }
}

async function refreshMenu() {
  if (menuRequest) return menuRequest;
  menuRequest = (async () => {
    try {
      const requestMenu = () => fetch("/api/menu", { cache: "no-store" });
      const response = await requestMenu().catch(() => requestMenu());
      if (!response.ok) throw new Error("Не вдалося завантажити меню.");
      const data = await response.json();
      const changed = !menuReady || JSON.stringify(dishes) !== JSON.stringify(data.dishes);
      dishes = data.dishes;
      const available = new Set(dishes.map(dish => dish.id));
      const stale = Object.keys(cart).filter(id => !available.has(id));
      stale.forEach(id => delete cart[id]);
      if (stale.length) { saveCart(); showToast("Недоступні страви прибрано з кошика."); }
      menuReady = true;
      byId("menuLoadError").hidden = true;
      byId("menuLoading").hidden = true;
      if (selectedDish && !available.has(selectedDish)) {
        selectedDish = "";
        if (location.hash.startsWith("#menu/")) history.replaceState(null, "", `#menu/${filter}`);
      }
      if (changed) {
        renderMenuNavigation(); renderMenu(); renderOrder(); renderCart(); renderBreadcrumbs();
        if (!byId("menu").hidden && selectedDish) focusSelectedDish();
      }
      return true;
    } catch (cause) {
      byId("menuLoading").hidden = true;
      byId("menuLoadError").hidden = false;
      byId("menuLoadError").querySelector("p").textContent = `${cause.message} Спробуйте ще раз.`;
      return false;
    }
  })();
  try { return await menuRequest; } finally { menuRequest = null; }
}

async function menuMutation(path, body) {
  const response = await fetch(path, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Не вдалося оновити меню.");
  return data;
}

function setManagerMode(value) {
  managerMode = value;
  if (!value) {
    byId("dishDialog").close();
    byId("removeDishDialog").close();
    byId("dishPhotoDialog").close();
  }
  renderMenu(); renderOrder();
}

function newDish() {
  if (!managerMode) return;
  byId("dishForm").reset();
  if (filter !== "all") byId("dishCategory").value = filter;
  byId("dishError").hidden = true;
  byId("dishDialog").showModal();
  byId("dishName").focus();
}

function editDishPhoto(id) {
  const dish = dishes.find(item => item.id === id);
  if (!managerMode || !dish) return;
  photoDishId = id;
  byId("dishPhotoForm").reset();
  byId("dishPhotoName").textContent = dish.name;
  byId("dishPhotoPreview").innerHTML = dishPhoto(dish);
  byId("dishPhotoCredit").value = dish.photo?.credit || "";
  byId("dishPhotoSource").value = dish.photo?.source || "";
  byId("dishPhotoError").hidden = true;
  const search = new URL("https://commons.wikimedia.org/wiki/Special:MediaSearch");
  const atlasEntry = Object.hasOwn(photoAtlas, id) ? photoAtlas[id] : null;
  search.searchParams.set("type", "image");
  search.searchParams.set("search", atlasEntry ? atlasEntry[1] : dish.name);
  byId("dishPhotoSearch").href = search.href;
  byId("dishPhotoDialog").showModal();
}

async function readDishPhoto(file) {
  if (!file || !file.size || file.size > 3 * 1024 * 1024) {
    throw new Error("Виберіть зображення розміром до 3 МБ.");
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Підтримуються зображення JPG, PNG і WebP.");
  }
  try {
    const bitmap = await createImageBitmap(file);
    bitmap.close();
  } catch {
    throw new Error("Зображення пошкоджене або його не вдалося відкрити.");
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",", 2)[1]);
    reader.onerror = () => reject(new Error("Не вдалося прочитати файл."));
    reader.readAsDataURL(file);
  });
}

function openCart() {
  renderCart();
  if (!cartDialog.open) cartDialog.showModal();
}

function validPhone(value) { const digits = value.replace(/\D/g, ""); return /^\+?[\d\s()\-]{10,22}$/.test(value.trim()) && digits.length >= 10 && digits.length <= 15; }

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

window.BrasaApp = {
  setView,
  showToast,
  validPhone,
  localDateString,
  setManagerMode,
  refreshMenu,
  getCartItems: () => dishes.filter(dish => cart[dish.id]).map(dish => ({ id: dish.id, quantity: cart[dish.id] })),
  clearCart: () => { cart = {}; saveCart(); },
  closeCart: () => { if (cartDialog.open) cartDialog.close(); }
};

document.addEventListener("click", event => {
  const link = event.target.closest("[data-view-link], [data-menu-route]");
  if (link && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
    event.preventDefault();
    if (link.hash.startsWith("#menu")) byId("menuSearch").value = "";
    closeNavigation();
    navigate(link.hash.slice(1));
  }
});
window.addEventListener("hashchange", () => setView(location.hash.slice(1)));
menuTrigger.addEventListener("click", () => {
  mobileNav.hidden = !mobileNav.hidden;
  menuTrigger.setAttribute("aria-expanded", String(!mobileNav.hidden));
});
document.addEventListener("click", event => {
  if (!byId("menuNavigation").contains(event.target)) closeNavigation();
  if (!mobileNav.hidden && !mobileNav.contains(event.target) && !menuTrigger.contains(event.target)) {
    mobileNav.hidden = true;
    menuTrigger.setAttribute("aria-expanded", "false");
  }
  const add = event.target.closest("[data-add]");
  if (add) {
    const id = add.dataset.add;
    if (!dishes.some(dish => dish.id === id)) return;
    cart[id] = Math.min((cart[id] || 0) + 1, 99);
    saveCart();
    showToast("Страву додано до кошика");
  }
  const quantity = event.target.closest("[data-quantity]");
  if (quantity) {
    const id = quantity.dataset.id;
    const next = (cart[id] || 0) + Number(quantity.dataset.quantity);
    if (next <= 0) delete cart[id];
    else cart[id] = Math.min(next, 99);
    saveCart();
  }
  if (event.target.closest("[data-new-dish]")) newDish();
  const photo = event.target.closest("[data-edit-photo]");
  if (photo) editDishPhoto(photo.dataset.editPhoto);
  const remove = event.target.closest("[data-remove-dish]");
  if (remove && managerMode) {
    removalId = remove.dataset.removeDish;
    const dish = dishes.find(item => item.id === removalId);
    if (!dish) return;
    byId("removeDishName").textContent = dish.name;
    byId("removeDishError").hidden = true;
    byId("removeDishDialog").showModal();
  }
  const close = event.target.closest("[data-close-dialog]");
  if (close) byId(close.dataset.closeDialog).close();
});
document.querySelectorAll(".cart-trigger").forEach(button => button.addEventListener("click", openCart));
byId("closeCart").addEventListener("click", () => cartDialog.close());
cartDialog.addEventListener("click", event => { if (event.target === cartDialog) cartDialog.close(); });
document.querySelectorAll("[data-filter]").forEach(button => button.addEventListener("click", () => {
  navigate(button.dataset.filter === "all" ? "menu" : `menu/${button.dataset.filter}`);
}));
byId("menuSearch").addEventListener("input", () => {
  if (selectedDish) {
    selectedDish = "";
    history.replaceState(null, "", filter === "all" ? "#menu" : `#menu/${filter}`);
    renderBreadcrumbs();
  }
  renderMenu();
});
byId("retryMenu").addEventListener("click", refreshMenu);
byId("dishForm").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const button = form.querySelector("button[type=submit]");
  button.disabled = true;
  const payload = Object.fromEntries(new FormData(form));
  try {
    const result = await menuMutation("/api/manager/dishes", payload);
    byId("dishDialog").close();
    byId("menuSearch").value = "";
    await refreshMenu();
    navigate(`menu/${result.dish.category}/${result.dish.id}`);
    showToast("Страву додано до меню.");
  } catch (cause) { byId("dishError").textContent = cause.message; byId("dishError").hidden = false; }
  finally { button.disabled = false; }
});
byId("confirmRemoveDish").addEventListener("click", async event => {
  const button = event.currentTarget;
  button.disabled = true;
  try {
    await menuMutation(`/api/manager/dishes/${removalId}/remove`, {});
    byId("removeDishDialog").close();
    await refreshMenu();
    showToast("Страву прибрано з меню.");
  } catch (cause) { byId("removeDishError").textContent = cause.message; byId("removeDishError").hidden = false; }
  finally { button.disabled = false; }
});
byId("dishPhotoForm").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button[type=submit]");
  const issue = byId("dishPhotoError");
  const id = photoDishId;
  const { file, credit, source } = Object.fromEntries(new FormData(form));
  button.disabled = true;
  issue.hidden = true;
  try {
    const image = await readDishPhoto(file);
    await menuMutation(`/api/manager/dishes/${id}/photo`, { image, credit, source });
    if (photoDishId === id) byId("dishPhotoDialog").close();
    if (menuRequest) await menuRequest;
    await refreshMenu();
    showToast("Фото страви збережено.");
  } catch (cause) {
    if (photoDishId === id) {
      issue.textContent = cause.message;
      issue.hidden = false;
    }
  } finally {
    button.disabled = false;
  }
});
bindDisclosure(byId("menuNavigation"));
window.addEventListener("focus", () => refreshMenu());

renderMenu();
renderOrder();
renderCart();
setView(location.hash.slice(1));
refreshMenu();

document.addEventListener("brasa:languagechange", () => {
  renderMenu();
  renderOrder();
  renderCart();
  renderBreadcrumbs();
});
