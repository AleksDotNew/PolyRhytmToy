# Rhythmic Polygon (PolyRhytmToy)

<p align="center">
  <a href="#english">English</a> • <a href="#русский">Русский</a>
</p>

---

<a name="english"></a>
## English

An interactive web-based instrument for geometrically designing drum rhythms as **nested, rotating irregular polygons** and exporting them to the live-coding environment **[Strudel](https://strudel.cc/)**.

Instead of a traditional 16-step grid, rhythm here emerges from time geometry:
* **Polygon Vertices** — Musical events (triggers / hits).
* **Side Lengths (Ratios)** — Time intervals between events.
* **Ring Radius** — Instrument / sound layer.
* **Rotation & Phase** — Phase displacement relative to the Master Clock.
* **Vertex Size** — Dynamics (velocity / gain).

### ✨ Features

* **Geometric Polyrhythm & Polymeter:**
  * Up to 5 instrument layers (Kick, Snare, Closed HH, Open HH, Percussion) with custom samples and colors.
  * Arbitrary irregular polygons based on proportions (e.g., `[3, 3, 2, 4]`, `[5, 2, 3, 2]`).
  * Cycle modes: **Locked** (all layers conform to the master cycle) and **Free** (individual cycle lengths for true polymeters).
* **Interactive Editing:**
  * Drag vertices along the circle to adjust interval timings.
  * Click a vertex to toggle it on/off.
  * `Shift + Drag` a vertex to adjust velocity (gain).
  * Drag polygon body/ring to adjust radius or rotate phase (0–360°).
* **Generative Behavior (Engines):**
  * `Static` — Fixed pattern.
  * `Rotation` — Steady, constant layer rotation.
  * `Phase Drift` — Subtle continuous phase displacement.
  * `Mutation` — Deterministic variation of ratios preserving the overall cycle length.
  * `Controlled Random` with a deterministic **Seed** (same seed guarantees identical variations).
* **Audio & Quantization:**
  * Built-in **Web Audio API** preview synthesizer with animated playhead sweeps and hit flashes.
  * Precise fractional event positions with optional quantization (`OFF`, `1/4`, `1/8`, `1/16`, `1/32`).
  * Built-in presets (Euclidean, 3:3:2, 3:2:3:2, 3:3:2:4, Square, Pentagon, Prime, etc.).
* **Strudel Live-Code Export:**
  * Real-time generation of valid Strudel code (`stack(...)`, `.gain(...)`).
  * One-click clipboard copy and `.js` file download.
* **Save & Load:**
  * Export and import complete projects via JSON.

### 🚀 Getting Started

This is a **100% static, client-side web application** built with pure HTML5, CSS3, and Vanilla JavaScript (ES6+).
* **No backend or server required** (no Python, Node.js, PHP, etc.).
* **No build tools or bundlers needed** (no Webpack, Vite, npm, etc.).
* **Works offline** in any modern web browser.

#### How to run:
Simply open `index.html` directly in your browser:
* Double-click `index.html` in your file manager, or
* On macOS terminal: `open index.html`
* On Linux terminal: `xdg-open index.html`
* On Windows terminal: `start index.html`

*(Can also be hosted on any static hosting like GitHub Pages, Vercel, or Netlify with zero configuration).*

### 📁 Project Structure

```text
PolyRhytmToy/
├── index.html        # Main static application entry point
├── css/
│   └── style.css     # Dark-theme styles, layouts, responsive design
├── js/
│   ├── app.js        # UI controllers, event bindings, and app bootstrap
│   ├── clock.js      # MasterClock (BPM, beats, subdivisions, timeline)
│   ├── geometry.js   # Coordinate transforms, angles, ratios, and radii
│   ├── polygon.js    # Rhythm polygon data model
│   ├── engine.js     # Behavioral engines (Static, Rotation, Drift, Mutation)
│   ├── audio.js      # Web Audio API preview synth/sampler
│   ├── renderer.js   # Canvas/SVG rendering (polygons, grid, playhead)
│   ├── strudel.js    # Strudel pattern syntax generator and exporter
│   ├── random.js     # Seeded pseudo-random number generator (PRNG)
│   └── state.js      # Project state serialization (Save / Load JSON)
├── docs/             # Documentation and design plans
└── AGENTS.md         # Product specification and technical requirements
```

### 🎹 Strudel Output Example

```javascript
stack(
  s("bd ~ ~ bd").gain("1 0 0.8 0.6"),
  s("~ sd ~ ~").gain("0 0.9 0 0"),
  s("hh ~ hh ~ hh").gain("0.7 0 0.5 0 0.6"),
  s("rim ~ ~ rim").gain("0.8 0 0 0.5")
)
```

---

<a name="русский"></a>
## Русский

Интерактивный веб-инструмент для геометрического конструирования барабанных ритмов в виде **вложенных вращающихся неправильных многоугольников** с экспортом в live-coding среду **[Strudel](https://strudel.cc/)**.

Вместо традиционной сетки из 16 кнопок ритм здесь формируется через геометрию времени:
* **Вершины многоугольника** — музыкальные события (триггеры / удары).
* **Длины сторон (соотношения / ratios)** — временные интервалы между событиями.
* **Радиус кольца** — инструмент / звуковой слой.
* **Вращение и фаза** — фазовое смещение относительно Master Clock.
* **Размер вершины** — динамика (velocity / gain).

### ✨ Основные возможности

* **Геометрическая полиритмия и полиметрия:**
  * До 5 слоёв инструментов (Kick, Snare, Closed HH, Open HH, Percussion) с настраиваемыми сэмплами и цветами.
  * Произвольные неправильные многоугольники на основе пропорций (например, `[3, 3, 2, 4]`, `[5, 2, 3, 2]`).
  * Режимы длины цикла: **Locked** (все слои укладываются в общий master cycle) и **Free** (индивидуальная длина цикла для полиметрии).
* **Интерактивное редактирование:**
  * Перетаскивание вершин по окружности для изменения тайминга интервалов.
  * Клик по вершине для включения/выключения звука.
  * `Shift + Drag` вершины для регулировки громкости (velocity).
  * Перетаскивание окружности по радиусу и вращение для сдвига фазы (0–360°).
* **Генеративные алгоритмы (Engines):**
  * `Static` — статичный паттерн.
  * `Rotation` — постоянное равномерное вращение слоя.
  * `Phase Drift` — плавный фазовый дрейф.
  * `Mutation` — детерминированная вариация пропорций с сохранением общей длины такта.
  * `Controlled Random` с управляемым **Seed** (одинаковый seed гарантирует одинаковый результат).
* **Аудио и квантизация:**
  * Встроенный превью-движок на **Web Audio API** с визуализацией прохождения playhead.
  * Поддержка точных дробных позиций и квантизации (`OFF`, `1/4`, `1/8`, `1/16`, `1/32`).
  * Встроенные пресеты (Euclidean, 3:3:2, 3:2:3:2, Square, Pentagon, Prime и др.).
* **Экспорт в Strudel:**
  * Генерация валидного Strudel-кода (`stack(...)`, `.gain(...)`) в реальном времени.
  * Копирование в буфер обмена в один клик и скачивание JS-файла.
* **Сохранение и загрузка:**
  * Экспорт и импорт проектов в формате JSON.

### 🚀 Быстрый старт

Это **полностью статическое клиентское веб-приложение** на чистом HTML5, CSS3 и Vanilla JavaScript (ES6+).
* **Бэкенд и сервер не требуются** (никакого Python, Node.js и прочего).
* **Сборка и зависимости не требуются** (никакого Webpack, npm, пакетов).
* **Работает офлайн** в любом современном браузере.

#### Как запустить:
Просто откройте файл `index.html` в браузере:
* Двойным кликом по `index.html` в проводнике/Finder, или
* Командой в терминале macOS: `open index.html`
* Командой в терминале Linux: `xdg-open index.html`
* Командой в терминале Windows: `start index.html`

*(Также проект можно разместить на любом статическом хостинге, например GitHub Pages, без каких-либо настроек).*

### 📁 Структура проекта

```text
PolyRhytmToy/
├── index.html        # Главная статическая страница приложения
├── css/
│   └── style.css     # Стили интерфейса (тёмная тема, панели, адаптив)
├── js/
│   ├── app.js        # Инициализация, UI-контроллеры и связывание модулей
│   ├── clock.js      # MasterClock (BPM, доли, деления, таймлайн)
│   ├── geometry.js   # Расчёт координат, углов, интервалов и радиусов
│   ├── polygon.js    # Модель данных ритмического многоугольника
│   ├── engine.js     # Движки поведения (Static, Rotation, Drift, Mutation)
│   ├── audio.js      # Web Audio API синтезатор / сэмплер
│   ├── renderer.js   # Отрисовка многоугольников, сетки, playhead и анимаций
│   ├── strudel.js    # Генератор и оптимизатор кода Strudel
│   ├── random.js     # PRNG с поддержкой deterministic seed
│   └── state.js      # Управление состоянием проекта (Save / Load JSON)
├── docs/             # Документация и справочные материалы
└── AGENTS.md         # Полная спецификация и архитектурное ТЗ проекта
```

---

## 📄 License / Лицензия

MIT
