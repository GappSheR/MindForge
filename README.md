# MindForge

Три программы для викторин — Made by GappSheRVIP777.

| Приложение | Назначение |
|---|---|
| **QuizForge Studio** | Редактор `.qgpsh`-проектов: слайды, таймеры, медиа, метаданные |
| **MindForge Quiz** | Игра-показ викторин: экран ведущего, команды, аудитория |
| **MindForge Admin Game** | Управление аккаунтами, баланс в тенге, выдача средств |

## Сборка

```bash
npm ci
npx vite build          # рендерер
# сборка трёх приложений через electron-packager (см. .github/workflows/build.yml)
```

## Обновления

Приложения автоматически проверяют новые версии в GitHub Releases при каждом запуске и предлагают скачать обновление (кнопка внизу экрана).

## Аккаунты и магазин

База пользователей — `Documents\MindForge\users.json`. При наличии токена GitHub база синхронизируется с приватным Gist (см. `electron/github.js`, `CONFIG`).

## Сайт

`site/` — статическая страница для GitHub Pages (deploy через ветку `gh-pages` или Actions).