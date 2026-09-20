# Мега Червь — Web / iOS PWA / Telegram Mini App

Русскоязычная веб-адаптация аркады про гигантского подземного червя. Проект сделан как статическое HTML5 Canvas-приложение, поэтому запускается без сервера приложений.

## Возможности
- русский интерфейс;
- сенсорное управление для iPhone/iPad;
- PWA: можно добавить на экран «Домой» в Safari;
- Telegram Mini App: подключён Telegram WebApp SDK;
- адаптивный Canvas, safe-area для iPhone;
- офлайн-кэш через Service Worker;
- GitHub Actions → GitHub Pages.

## Запуск локально
```bash
python3 -m http.server 8080
```
Откройте `http://localhost:8080`.

## GitHub Pages
Workflow `.github/workflows/deploy-pages.yml` запускается на каждый push в `main`. Если репозиторий новый, в Settings → Pages выберите **GitHub Actions** как Source.

## Telegram Mini App
После публикации GitHub Pages укажите HTTPS URL приложения в BotFather (Mini App / Menu Button). Приложение автоматически определит Telegram WebView и вызовет `ready()` / `expand()`.

## iOS
Откройте опубликованный URL в Safari → «Поделиться» → «На экран Домой». PWA запускается как отдельное полноэкранное приложение.

## Примечание по APK
APK — старая Unity-сборка. APK не содержит исходного Unity-проекта, поэтому её нельзя корректно пересобрать в WebGL прямой конвертацией. Эта версия является веб-реализацией основной игровой механики с русским интерфейсом и мобильным управлением.
