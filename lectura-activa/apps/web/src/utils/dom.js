/* Helpers de DOM — Dueño: Omar */

export function qs(selector, parent = document) {
  return parent.querySelector(selector);
}

export function qsa(selector, parent = document) {
  return Array.from(parent.querySelectorAll(selector));
}

export function setText(selector, text) {
  const el = typeof selector === "string" ? qs(selector) : selector;
  if (el) el.textContent = text ?? "";
}

export function setField(field, value) {
  const el = qs(`[data-field="${field}"]`);
  if (el) el.textContent = value ?? "";
}

export function setAttr(selector, attr, value) {
  const el = typeof selector === "string" ? qs(selector) : selector;
  if (el) el.setAttribute(attr, value);
}

export function show(selector) {
  const el = typeof selector === "string" ? qs(selector) : selector;
  if (el) el.hidden = false;
}

export function hide(selector) {
  const el = typeof selector === "string" ? qs(selector) : selector;
  if (el) el.hidden = true;
}

export function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function generateRequestId() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function escapeHtml(text) {
  if (text == null) return "";
  const div = document.createElement("div");
  div.textContent = String(text);
  return div.innerHTML;
}
