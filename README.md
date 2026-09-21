# Мега Червь — Web / iOS PWA / Telegram Mini App

Русскоязычная браузерная реконструкция Super Mega Worm 2.0.0 по данным оригинального Unity APK. Игра работает как статическое HTML5 Canvas-приложение, поддерживает Safari/iPhone, установку как PWA и Telegram Mini App.

## Что восстановлено

- две кампании: **Standard Adventure** и **Xmas2 / Santa**;
- оригинальные таблицы уровней из Unity plist с `Count`, `Max`, `SpawnDelay`, `GrowthRequired` и флагами режимов;
- Standard Adventure: нормальная прогрессия до Level 25, 30-секундный `BonusMode` на 5/10/15/20; Level 26 сохранён как скрытая/служебная запись;
- Xmas2: Levels 1–17, `BonusMode` на 5/10/15, `CutsceneBoss` на Level 16 и Giant Robot на Level 17;
- реальные параметры движения `SMW_Player` из `Assembly-CSharp.dll`;
- восстановленные патруль/стрельба техники, танковые и самонаводящиеся ракеты, мины вертолёта;
- Bomber1 → Paratrooper, Bomber2 → ParaDriller, Bomber3 → Nuke;
- EMP, огненный плевок и удар-метеорит;
- оригинальные текстуры Воджиры, земли, фона, техники и боссов;
- восстановленные звуки для EMP, ракет, попаданий и взрывов;
- русский интерфейс, touch-кнопки, safe-area iPhone, Telegram WebApp SDK и offline Service Worker.

Основная опубликованная сборка: `app-v16.js`. Она содержит восстановленные таблицы Standard/Xmas2 и чистую игровую логику v16 в сжатом браузерном bundle.

Подробности восстановления: [`RECOVERY.md`](RECOVERY.md).

## Запуск локально

```bash
python3 -m http.server 8080
```

Откройте `http://localhost:8080`.

## GitHub Pages

Каждый push в `main` публикуется через `.github/workflows/deploy-pages.yml`.

Публичный адрес:

`https://vidalost.github.io/Mega/`

## Telegram Mini App

В BotFather укажите URL `https://vidalost.github.io/Mega/`. Приложение определяет Telegram WebView и вызывает `ready()` / `expand()`.

## iOS

Откройте сайт в Safari → «Поделиться» → «На экран Домой». PWA запускается отдельно и учитывает safe-area iPhone.

## Точность реконструкции

Таблицы прогрессии, физические константы, классы, многие FSM-переменные и ресурсы взяты непосредственно из APK 2.0.0. Браузерный рендеринг, размеры коллизий и часть связей prefab ↔ FSM адаптированы под Canvas там, где исходный Unity runtime невозможно перенести побайтно без проекта Unity.
