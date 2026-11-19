// Izum — вкладки панели настроек конструктора: «Изделие» и «Нанесение».
// Механика конструктора (constructor.js) о вкладках не знает: она только показывает и прячет блоки по id.
// Здесь — переключение вкладок, автопереход к настройкам выбранного нанесения и закрытие списка «Все мерки».
// На высоком окне и на телефоне вкладок нет (обе части видны сразу, см. css/constructor.css) — скрипт там ничему не мешает.
(() => {
  "use strict";
  const panel = document.getElementById("panel");
  if (!panel) return;
  const tabs = [...panel.querySelectorAll(".mk-ptabs [data-pane]")];
  const show = (name) => {
    panel.dataset.pane = name;
    tabs.forEach((b) => { const on = b.dataset.pane === name; b.classList.toggle("on", on); b.setAttribute("aria-selected", on); });
  };
  panel.querySelector(".mk-ptabs").addEventListener("click", (e) => { const b = e.target.closest("[data-pane]"); if (b) show(b.dataset.pane); });

  // Выбрали нанесение — на изделии, на выкройке или в слоях — открываем «Нанесение»: слои и настройки выбранного там рядом.
  // Только после действия пользователя (не при загрузке) и не тогда, когда выбор сменился из-за действий
  // на вкладке «Изделие»: там меняют размер и цвет ткани, вкладка под рукой прыгать не должна.
  const item = document.getElementById("paneItem"), props = document.getElementById("props"), multi = document.getElementById("multi"), lib = document.getElementById("lib");
  let last = null, touched = false, was = !props.hidden || !multi.hidden, had = lib.children.length;
  const act = (e) => { touched = true; last = e.target; };
  addEventListener("pointerdown", act, true);
  addEventListener("drop", act, true);
  const fromItem = () => last instanceof Node && item.contains(last);
  const sync = () => {
    const now = !props.hidden || !multi.hidden;
    if (now && !was && touched && !fromItem()) show("print");
    was = now;
  };
  new MutationObserver(sync).observe(props, { attributes: true, attributeFilter: ["hidden"] });
  new MutationObserver(sync).observe(multi, { attributes: true, attributeFilter: ["hidden"] });
  // Перетащили файл в окно, пока открыто «Изделие», — показываем, куда он попал.
  new MutationObserver(() => {
    const n = lib.children.length;
    if (n > had && touched) show("print");
    had = n;
  }).observe(lib, { childList: true });

  // «Все мерки»: закрыть по клику мимо и по Escape.
  const more = panel.querySelector(".mk-more");
  if (more) {
    addEventListener("pointerdown", (e) => { if (more.open && !more.contains(e.target)) more.open = false; });
    addEventListener("keydown", (e) => { if (e.key === "Escape") more.open = false; });
  }
})();
