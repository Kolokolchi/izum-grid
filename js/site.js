// Izum — сайт на сетке знака. Общий скрипт всех страниц: меню, восемь точек — восемь цветов, появление блоков.
// Только на главной: линии знака на первом экране, вещь в арке (оборот 360°), смена фото цехов, арки цехов, схема доставки.
// Каждый блок сам проверяет, есть ли на странице его элементы.
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Пропорции, снятые со знака (доли ширины и высоты знака).
  const LOGO = { arch: 0.4155, stem: 0.208, m0: 0.4806, shoulder: 0.2525, zStart: 0.5226, zTop: 0.8885, zFoot: 0.5465, vX: 0.4995, vY: 0.68 };

  // ---------- Цвет: восемь точек арки ----------
  const COLORS = [
    { id: "yellow", name: "Жёлтый", hex: "#ffd400" },
    { id: "red", name: "Красный", hex: "#e3262d" },
    { id: "orange", name: "Оранжевый", hex: "#ff6a13" },
    { id: "pink", name: "Розовый", hex: "#ff4f9a" },
    { id: "violet", name: "Фиолетовый", hex: "#7a3cff" },
    { id: "blue", name: "Синий", hex: "#1f55ff" },
    { id: "green", name: "Зелёный", hex: "#12a150" },
    { id: "white", name: "Белый", hex: "#f6f4ee" },
  ];
  let color = COLORS[0];
  window.IZUM_COLORS = COLORS;   // конструктор берёт отсюда цвета ткани
  const hexRgb = (hex) => [1, 3, 5].map((p) => parseInt(hex.slice(p, p + 2), 16));

  // Перекраска: вещи сняты жёлтыми (#FFD400) с чёрным, светлота жёлтой ткани переносится на выбранный цвет (tone.js).
  let lut = null, lutFor = "";
  function tintData(d) {
    if (lutFor !== color.id) { lut = new Map(); lutFor = color.id; }
    const tn = window.IZUM_TONE.target(color.hex);
    for (let p = 0; p < d.length; p += 4) {
      const al = d[p + 3];
      if (!al) continue;
      const r = d[p], g = d[p + 1], b = d[p + 2], c = (r + g) / 2 - b;
      if (c <= 12) continue;
      const m = c >= 40 ? 1 : (c - 12) / 28, key = (r << 16) | (g << 8) | b;
      let o = lut.get(key);
      if (!o) { o = window.IZUM_TONE.pixel(r / 255, g / 255, b / 255, tn).map((v) => v * 255); lut.set(key, o); }
      d[p] = r + (o[0] - r) * m;
      d[p + 1] = g + (o[1] - g) * m;
      d[p + 2] = b + (o[2] - b) * m;
      // светлый полупрозрачный ореол по контуру на цветном читается грязью — гасим
      const lum = (0.3 * r + 0.59 * g + 0.11 * b) / 255, av = al / 255;
      if (av < 0.92 && lum > 0.5) { const q = Math.min(1, Math.max(0, (av - 0.45) / 0.47)), w = Math.min(1, (lum - 0.5) / 0.25); d[p + 3] = al * (1 - w + w * q * q * (3 - 2 * q)); }
    }
  }

  // Картинки вне первого экрана (img[data-tint])
  const tinted = $$("img[data-tint]").map((img) => ({ img, src: img.getAttribute("src"), base: null }));
  function tintImg(t) {
    if (!t.base) return;
    if (color.id === "yellow") { t.img.src = t.src; return; }
    const cv = document.createElement("canvas");
    cv.width = t.base.naturalWidth; cv.height = t.base.naturalHeight;
    const g = cv.getContext("2d");
    g.drawImage(t.base, 0, 0);
    const im = g.getImageData(0, 0, cv.width, cv.height);
    tintData(im.data);
    g.putImageData(im, 0, 0);
    t.img.src = cv.toDataURL("image/png");
  }
  tinted.forEach((t) => {
    // исходник берём после загрузки самой картинки: у неё loading="lazy"
    const start = () => { const base = new Image(); base.onload = () => { t.base = base; tintImg(t); }; base.src = t.src; };
    if (t.img.complete && t.img.naturalWidth) start();
    else t.img.addEventListener("load", start, { once: true });
  });

  function setColor(id) {
    color = COLORS.find((c) => c.id === id) || COLORS[0];
    const rgb = hexRgb(color.hex);
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const rl = 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
    // текст поверх цвета — чёрный или белый, у кого выше контраст; почти белый цвет на белой странице
    // не виден — плашки тогда чёрные
    const darkOn = (rl + 0.05) / 0.0537 > 1.05 / (rl + 0.05), pale = 1.05 / (rl + 0.05) < 1.25;
    const st = root.style;
    st.setProperty("--accent", color.hex);
    st.setProperty("--plate", pale ? "#0d0d0d" : color.hex);
    st.setProperty("--on-plate", pale ? "#ffffff" : darkOn ? "#0d0d0d" : "#ffffff");
    st.setProperty("--on-accent", darkOn ? "#0d0d0d" : "#ffffff");
    $$("#swatches button, [data-swatches] button").forEach((b) => { const on = b.dataset.id === color.id; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
    try { sessionStorage.setItem("izum-color", color.id); } catch (e) { /* хранилище недоступно */ }
    tinted.forEach(tintImg);
    turn.paint();
  }
  // Вход на сайт — с жёлтого; внутри визита держится выбранный цвет.
  function startColor() {
    let cur = null;
    try { cur = sessionStorage.getItem("izum-color"); } catch (e) { /* нет доступа */ }
    return COLORS.some((c) => c.id === cur) ? cur : "yellow";
  }

  // ---------- Вещь в арке: оборот 360° ----------
  const ITEMS = [
    { id: "hoodie", n: 124, name: "Худи", set: "Одежда · пошив оптом" },
    { id: "sweatshirt", n: 118, name: "Свитшот", set: "Одежда · пошив оптом" },
    { id: "tshirt", n: 130, name: "Футболка оверсайз", set: "Одежда · пошив оптом" },
    { id: "polo", n: 118, name: "Поло", set: "Одежда · пошив оптом" },
    { id: "bomber", n: 132, name: "Бомбер", set: "Одежда · пошив оптом" },
    { id: "tote", n: 118, name: "Дутый шопер", set: "Аксессуары · мерч" },
    { id: "ushanka", n: 190, name: "Ушанка", set: "Аксессуары · мерч" },
    { id: "cap", n: 200, name: "Кепка", set: "Аксессуары · мерч" },
  ];
  const TURN_MS = 11000;        // один оборот
  const pad3 = (k) => String(k).padStart(3, "0");
  const pad2 = (k) => String(k).padStart(2, "0");

  const turn = (() => {
    const cv = $("#turn");
    if (!cv) return { paint() {}, start() {}, prev() {}, next() {} };   // внутренние страницы: вещи в арке нет
    const g = cv.getContext("2d", { willReadFrequently: true });
    const cache = new Map();    // id → { frames: Image[], ready: число загруженных, done }
    let cur = 0, k = 0, t0 = 0, kFrom = 0, spins = 0, visible = true, drag = null, hold = 0, raf = 0, shown = -1, userPicked = false;

    function load(i, all) {
      const it = ITEMS[i];
      let c = cache.get(it.id);
      if (!c) { c = { frames: new Array(it.n), ready: 0, done: false, asked: 0 }; cache.set(it.id, c); }
      const want = all ? it.n : 1;
      const next = () => {
        if (c.asked >= want) return;
        const j = c.asked++;
        const im = new Image();
        im.decoding = "async";
        im.onload = im.onerror = () => {
          if (im.naturalWidth) c.frames[j] = im;
          c.ready++;
          if (c.ready >= it.n) c.done = true;
          if (j === 0 && i === cur) { fit(); paint(); cv.classList.remove("swap"); }
          next();
        };
        im.src = `img/turn/${it.id}/${pad3(j)}.webp`;
      };
      for (let q = 0; q < 6; q++) next();   // шесть запросов разом, остальные — по мере загрузки
      return c;
    }
    function fit() {
      const f = cache.get(ITEMS[cur].id).frames[0];
      if (f && (cv.width !== f.naturalWidth || cv.height !== f.naturalHeight)) { cv.width = f.naturalWidth; cv.height = f.naturalHeight; shown = -1; }
    }
    function frame(kk) {
      const c = cache.get(ITEMS[cur].id);
      if (!c) return null;
      // пока оборот догружается, берём ближайший загруженный кадр назад
      for (let j = kk; j >= 0; j--) if (c.frames[j]) return c.frames[j];
      return null;
    }
    function paint(force = true) {
      const f = frame(k);
      if (!f) return;
      if (!force && shown === k) return;
      shown = k;
      g.clearRect(0, 0, cv.width, cv.height);
      g.drawImage(f, 0, 0, cv.width, cv.height);
      if (color.id !== "yellow") {
        const im = g.getImageData(0, 0, cv.width, cv.height);
        tintData(im.data);
        g.putImageData(im, 0, 0);
      }
    }
    function label() {
      const it = ITEMS[cur];
      $("#itemCount").textContent = `${pad2(cur + 1)} / ${pad2(ITEMS.length)}`;
      $("#itemName").textContent = it.name;
      $("#itemSet").textContent = it.set;
      cv.setAttribute("aria-label", `${it.name}: вращается на 360°`);
    }
    function show(i, byUser) {
      cur = (i + ITEMS.length) % ITEMS.length;
      if (byUser) userPicked = true;
      k = 0; kFrom = 0; spins = 0; t0 = performance.now(); shown = -1;
      label();
      const c = load(cur, false);
      if (c.frames[0]) { fit(); paint(); cv.classList.remove("swap"); }
      else cv.classList.add("swap");
      load(cur, true);
    }
    function tick(now) {
      raf = requestAnimationFrame(tick);
      if (!visible || drag || document.hidden) { t0 = now; kFrom = k; return; }
      if (now < hold) { t0 = now; kFrom = k; return; }
      const it = ITEMS[cur], c = cache.get(it.id);
      if (!c || !c.done) { t0 = now; return; }
      const turns = (now - t0) / TURN_MS;
      const kk = (kFrom + Math.floor(turns * it.n)) % it.n;
      if (kk !== k) { k = kk; paint(false); }
      // после полного оборота показываем следующую вещь; её кадры начинаем грузить на середине оборота
      if (turns > 0.5 && !userPicked) load((cur + 1) % ITEMS.length, true);
      if (turns >= 1 && !userPicked) {
        const nx = cache.get(ITEMS[(cur + 1) % ITEMS.length].id);
        if (nx && nx.frames[0]) { cv.classList.add("swap"); setTimeout(() => show(cur + 1, false), 380); t0 = now + 1e7; }
        else { t0 = now; kFrom = k; }
      } else if (turns >= 1) { t0 = now; kFrom = k; }
    }
    // перетаскивание — вращение рукой
    cv.addEventListener("pointerdown", (ev) => {
      const c = cache.get(ITEMS[cur].id);
      if (!c || !c.done) return;
      drag = { x: ev.clientX, k };
      cv.setPointerCapture(ev.pointerId);
      cv.classList.add("grab");
    });
    cv.addEventListener("pointermove", (ev) => {
      if (!drag) return;
      const n = ITEMS[cur].n, w = cv.getBoundingClientRect().width || 1;
      k = (((drag.k - Math.round(((ev.clientX - drag.x) / w) * n * 0.6)) % n) + n) % n;
      paint(false);
    });
    const drop = () => { if (!drag) return; drag = null; cv.classList.remove("grab"); hold = performance.now() + 2200; userPicked = true; };
    cv.addEventListener("pointerup", drop);
    cv.addEventListener("pointercancel", drop);

    if ("IntersectionObserver" in window) new IntersectionObserver((es) => { visible = es[0].isIntersecting; }).observe(cv);
    return {
      paint,
      start() { show(0, false); if (!reduce) raf = requestAnimationFrame(tick); },
      prev() { cv.classList.add("swap"); setTimeout(() => show(cur - 1, true), 240); },
      next() { cv.classList.add("swap"); setTimeout(() => show(cur + 1, true), 240); },
    };
  })();
  if ($("#itemPrev")) { $("#itemPrev").addEventListener("click", turn.prev); $("#itemNext").addEventListener("click", turn.next); }

  // точки цвета: в арке первого экрана (#swatches) и в полосах цвета на внутренних страницах ([data-swatches])
  $$("#swatches, [data-swatches]").forEach((sw) => {
    sw.innerHTML = COLORS.map((c) => `<button type="button" data-id="${c.id}" style="--c:${c.hex}" title="${c.name}" aria-label="${c.name}"></button>`).join("");
    sw.addEventListener("click", (ev) => { const b = ev.target.closest("button"); if (b) setColor(b.dataset.id); });
  });

  // ---------- Линии знака на первом экране ----------
  const hero = $("#top.hero"), heroGrid = $("#heroGrid"), lines = $("#heroLines");
  function drawHero() {
    if (!lines || getComputedStyle(lines).display === "none") return;
    const g = heroGrid.getBoundingClientRect(), a = $("#heroU").getBoundingClientRect(), m = $("#heroM").getBoundingClientRect(), z = $(".hero-z").getBoundingClientRect();
    const W = g.width, H = g.height;
    if (!W || !a.width) return;
    const ax0 = a.left - g.left, ax1 = a.right - g.left, mx0 = m.left - g.left, mx1 = m.right - g.left;
    const yTop = z.top - g.top, yMid = a.top - g.top, yBot = H;
    const C = mx1 - ax0;                                   // ширина знака на экране
    const X = (u) => ax0 + C * u;
    const sx = X(LOGO.stem), R = Math.min((ax1 - ax0) * LOGO.shoulder, (yBot - yMid) * 0.6);
    const f = (v) => v.toFixed(1);
    lines.setAttribute("viewBox", `0 0 ${f(W)} ${f(H)}`);
    const d = {
      lnI: `M${f(sx)} 0V${f(yMid)}`,
      lnU: `M${f(ax0)} ${f(yBot)}V${f(yMid + R)}A${f(R)} ${f(R)} 0 0 1 ${f(ax0 + R)} ${f(yMid)}H${f(ax1 - R)}A${f(R)} ${f(R)} 0 0 1 ${f(ax1)} ${f(yMid + R)}V${f(yBot)}`,
      lnZ: `M${f(X(LOGO.zStart))} ${f(yTop)}H${f(X(LOGO.zTop))}L${f(X(LOGO.zFoot))} ${f(yMid)}`,
      lnM: `M${f(mx0)} ${f(yBot)}V${f(yMid)}H${f(mx1)}V${f(yBot)}`,
      lnV: `M${f(mx0)} ${f(yMid)}L${f(mx0 + (mx1 - mx0) * LOGO.vX)} ${f(yMid + (yBot - yMid) * LOGO.vY)}L${f(mx1)} ${f(yMid)}`,
    };
    const delay = { lnI: 0, lnU: 0.35, lnZ: 0.25, lnM: 0.6, lnV: 0.95 };
    for (const id in d) {
      const p = $("#" + id);
      p.setAttribute("d", d[id]);
      p.style.setProperty("--len", Math.ceil(p.getTotalLength()) + 2);
      p.style.setProperty("--d", delay[id] + "s");
    }
  }
  if (hero) {
    drawHero();
    let rz = 0;
    addEventListener("resize", () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => { hero.classList.add("still"); drawHero(); }); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawHero);
  }

  // ---------- Фото цехов в ячейках Z и M ----------
  const SHOTS = [
    { cap: "Швейный цех", z: "sew-01", zp: "50% 46%", v: "sew-05", vp: "50% 62%", za: "Швейный цех: ряды машин", va: "Раскройный стол: мастер размечает полотно с принтом" },
    { cap: "Шелкография", z: "silk-11", zp: "50% 52%", v: "silk-17", vp: "50% 66%", za: "Цех шелкографии с карусельными станками", va: "Печатник протягивает ракель по трафарету" },
    { cap: "DTF-печать", z: "dtf-32", zp: "50% 48%", v: "dtf-34", vp: "50% 50%", za: "Участок DTF-печати", va: "Красные детали кроя с принтами под термопрессом" },
    { cap: "Сублимация", z: "sub-42", zp: "50% 58%", v: "sub-45", vp: "50% 66%", za: "Широкоформатные принтеры в цехе сублимации", va: "Полотно с сублимационной печатью" },
    { cap: "Шевроны и брелоки", z: "patch-64", zp: "50% 40%", v: "patch-69", vp: "50% 62%", za: "Отлитые шевроны в ячейках формы", va: "Дозатор заливает цвет в ячейки формы" },
  ];
  const shotsZ = $("#shotsZ"), shotsV = $("#shotsV");
  const shotImg = (box, name, pos, alt, eager) => {
    const im = new Image();
    im.alt = alt; im.decoding = "async"; im.style.objectPosition = pos;
    im.sizes = "(max-width: 900px) 100vw, 46vw";
    im.srcset = `img/production/${name}-800.webp 800w, img/production/${name}-1600.webp 1600w`;
    im.src = `img/production/${name}-800.webp`;
    if (eager) im.fetchPriority = "high";
    box.appendChild(im);
    return im;
  };
  const shotEls = [];
  function shot(i) {
    if (!shotEls[i]) { const s = SHOTS[i]; shotEls[i] = [shotImg(shotsZ, s.z, s.zp, s.za, i === 0), shotImg(shotsV, s.v, s.vp, s.va, i === 0)]; }
    return shotEls[i];
  }
  let shotNow = -1;
  function showShot(i) {
    i = (i + SHOTS.length) % SHOTS.length;
    const els = shot(i);
    const go = () => {
      shotEls.forEach((p, j) => p && p.forEach((im) => im.classList.toggle("on", j === i)));
      $("#shotNum").textContent = `${pad2(i + 1)} / ${pad2(SHOTS.length)}`;
      $("#shotCap").textContent = SHOTS[i].cap;
      shotNow = i;
    };
    Promise.all(els.map((im) => (im.decode ? im.decode().catch(() => {}) : Promise.resolve()))).then(() => requestAnimationFrame(go));
  }
  if (shotsZ) {
    showShot(0);
    if (!reduce) setInterval(() => { if (!document.hidden && scrollY < innerHeight) showShot(shotNow + 1); }, 5200);
  }

  // ---------- Запуск первого экрана ----------
  root.classList.add("rev-on");
  turn.start();
  setColor(startColor());
  if (hero) {
    requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add("ready")));
    setTimeout(() => hero.classList.add("live"), 2800);
  }

  // ---------- Появление блоков и цифры ----------
  const rev = $$("[data-rev], .steps, .geo");
  const count = (el) => {
    const n = +el.dataset.n, suf = el.dataset.suf || "", t0 = performance.now(), ms = 1300;
    if (reduce || !n) return;
    const step = (now) => { const q = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - q, 3); el.textContent = Math.round(n * e) + suf; if (q < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };
  const reveal = (el) => { el.classList.add("in"); $$("b[data-n]", el).forEach(count); };
  if ("IntersectionObserver" in window && !reduce) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { reveal(e.target); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
    rev.forEach((el) => io.observe(el));
  } else rev.forEach((el) => el.classList.add("in"));

  // ---------- Арки цехов ----------
  const arches = $$("#arches .arch");
  const setArch = (a) => arches.forEach((x) => { const on = x === a; x.classList.toggle("on", on); x.setAttribute("aria-expanded", on); });
  arches.forEach((a) => {
    a.setAttribute("aria-expanded", a.classList.contains("on"));
    a.addEventListener("click", () => setArch(a));
    a.addEventListener("pointerenter", (ev) => { if (ev.pointerType === "mouse") setArch(a); });
    a.addEventListener("focus", () => setArch(a));
  });

  // ---------- Доставка: нити из Алматы ----------
  (() => {
    const svg = $("#geo");
    if (!svg) return;
    // [город, широта, долгота, класс, место подписи: 0 справа от точки, 1 слева, 2 над точкой, 3 под точкой]
    const CITIES = [
      ["Астана", 51.17, 71.43, "big", 0], ["Шымкент", 42.32, 69.6, "big", 1], ["Караганда", 49.8, 73.1, "", 1], ["Актобе", 50.28, 57.17, "", 0],
      ["Тараз", 42.9, 71.37, "", 2], ["Павлодар", 52.29, 76.97, "", 0], ["Усть-Каменогорск", 49.95, 82.61, "", 3], ["Семей", 50.41, 80.23, "", 1],
      ["Атырау", 47.09, 51.92, "", 0], ["Костанай", 53.21, 63.63, "", 1], ["Кызылорда", 44.85, 65.51, "", 1], ["Уральск", 51.23, 51.37, "", 0],
      ["Петропавловск", 54.87, 69.14, "", 0], ["Актау", 43.65, 51.17, "", 0], ["Кокшетау", 53.28, 69.39, "", 0], ["Жезказган", 47.78, 67.71, "", 1],
    ];
    const HUB = ["Алматы", 43.24, 76.95];
    const W = 600, H = 380, L0 = 49.5, L1 = 84.5, B0 = 41.6, B1 = 55.6;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const px = (lon) => 20 + ((lon - L0) / (L1 - L0)) * (W - 86);
    const py = (lat) => 26 + ((B1 - lat) / (B1 - B0)) * (H - 70);
    const hx = px(HUB[2]), hy = py(HUB[1]);
    const f = (v) => v.toFixed(1);
    let ln = "", pts = "", txt = "";
    CITIES.forEach(([name, lat, lon, cls, at], i) => {
      const x = px(lon), y = py(lat), len = Math.ceil(Math.hypot(x - hx, y - hy));
      ln += `<line x1="${f(hx)}" y1="${f(hy)}" x2="${f(x)}" y2="${f(y)}" style="--len:${len};--d:${(i * 0.05).toFixed(2)}s"/>`;
      pts += `<circle cx="${f(x)}" cy="${f(y)}" r="${cls === "big" ? 3.6 : 2.6}"/>`;
      const mid = at >= 2, tx = mid ? x : x + (at === 1 ? -9 : 9), ty = at === 2 ? y - 9 : at === 3 ? y + 17 : y + 3.8;
      txt += `<text class="${cls}" x="${f(tx)}" y="${f(ty)}" text-anchor="${mid ? "middle" : at === 1 ? "end" : "start"}" style="--d:${(0.4 + i * 0.05).toFixed(2)}s">${name}</text>`;
    });
    // за пределы страны — пунктир уходит за край схемы
    [[-10, 196, "← СНГ", "start", 0], [W + 10, 214, "Мир →", "end", W]].forEach(([x, y, t, anchor, lx]) => {
      ln += `<line class="ray" x1="${f(hx)}" y1="${f(hy)}" x2="${x}" y2="${y}"/>`;
      txt += `<text class="out" x="${lx}" y="${y - 10}" text-anchor="${anchor}" style="--d:1.2s">${t}</text>`;
    });
    const out = ln + pts + `<circle class="hub" cx="${f(hx)}" cy="${f(hy)}" r="9"/>` + txt
      + `<text class="cap" x="${f(hx + 18)}" y="${f(hy + 8)}" style="--d:.2s">${HUB[0]}</text>`;
    svg.innerHTML = out;
  })();

  // ---------- Меню, восемь точек — восемь разделов ----------
  // Пункты: 0 главная · 1 о компании · 2 производство · 3 одежда оптом · 4 продукция · 5 конструктор · 6 как работаем · 7 контакты.
  // У страницы свой номер (body[data-page]); блоки с data-dot переключают точку по мере прокрутки.
  const PAGE = +document.body.dataset.page || 0;
  const menuBtn = $("#menuBtn"), menu = $("#menu"), menuT = $(".rail-menu-t");
  function setMenu(open) {
    root.classList.toggle("menu-open", open);
    menuBtn.setAttribute("aria-expanded", open);
    menu.setAttribute("aria-hidden", !open);
    menuT.textContent = open ? menuT.dataset.close : menuT.dataset.open;
  }
  menuBtn.addEventListener("click", () => setMenu(!root.classList.contains("menu-open")));
  $("#menuX").addEventListener("click", () => setMenu(false));
  $$(".menu-nav a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  addEventListener("keydown", (ev) => { if (ev.key === "Escape") setMenu(false); });

  const secs = $$("[data-dot]"), navDots = $$("#navDots circle"), navLinks = $$(".menu-nav a");
  let spyRaf = 0;
  function spy() {
    spyRaf = 0;
    root.classList.toggle("scrolled", scrollY > innerHeight * 0.5);
    const line = innerHeight * 0.45;
    let on = PAGE;
    secs.forEach((s) => { if (s.getBoundingClientRect().top <= line) on = +s.dataset.dot; });
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) on = 7;
    navDots.forEach((c, i) => c.classList.toggle("on", i === on));
    navLinks.forEach((a, i) => a.classList.toggle("on", i === on));
  }
  addEventListener("scroll", () => { if (!spyRaf) spyRaf = requestAnimationFrame(spy); }, { passive: true });
  spy();
})();
