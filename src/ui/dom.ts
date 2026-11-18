/** Tiny DOM helpers for the HTML overlay. No framework. */

type Child = Node | string | number | null | undefined | false;
type Attrs = Record<string, string | number | boolean | EventListener | undefined | null>;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: (Child | Child[])[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') {
      el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    } else if (k === 'class') {
      el.className = String(v);
    } else if (v === true) {
      el.setAttribute(k, '');
    } else {
      el.setAttribute(k, String(v));
    }
  }
  append(el, children);
  return el;
}

export function append(el: Element, children: (Child | Child[])[]): void {
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

function root(): HTMLElement {
  const el = document.getElementById('ui');
  if (!el) throw new Error('#ui overlay root missing');
  return el;
}

/** A named layer in the overlay. Mounting replaces the layer's content. */
export function layer(name: string): HTMLElement {
  let el = root().querySelector<HTMLElement>(`:scope > [data-layer="${name}"]`);
  if (!el) {
    el = h('div', { class: 'layer', 'data-layer': name });
    root().append(el);
  }
  return el;
}

export function mount(name: string, ...children: Child[]): HTMLElement {
  const el = layer(name);
  el.replaceChildren();
  append(el, children);
  return el;
}

export function clear(name: string): void {
  root().querySelector(`:scope > [data-layer="${name}"]`)?.remove();
}

export function clearAll(): void {
  root().replaceChildren();
}

/** True when the user is typing in a field, so game keys should be ignored. */
export function typing(): boolean {
  const a = document.activeElement;
  return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA');
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function toast(text: string, ms = 2600): void {
  const el = mount('toast', h('div', { class: 'toast', role: 'status' }, text));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), ms);
}
