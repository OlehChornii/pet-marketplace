# Pet Marketplace — Документація

## Коротке пояснення

Проєкт "Pet Marketplace" — веб-додаток (Create React App) для продажу/прийняття тварин. Цей README містить все необхідне для запуску, розробки, тестування та деплою.

## Основні вимоги

- Node.js >= 16 (рекомендується LTS)
- npm або yarn
- Git

## Швидкий старт

1. Клонувати репозиторій:

   ```bash
   git clone <repo-url>
   cd pet-marketplace
   ```

2. Встановити залежності:

   ```bash
   npm install
   # або
   yarn
   ```

3. Запустити в режимі розробки:

   ```bash
   npm start
   # або
   yarn start
   ```

   Відкрийте http://localhost:3000

## Сценарії (npm scripts)

- `npm start` — запуск дев-сервера (CRA).
- `npm run build` — створення production-білду в папці `build`.
- `npm test` — запуск тестів (Jest).
- `npm run lint` — запуск ESLint.
- `npm run format` — запуск Prettier (якщо налаштовано).

## Налаштування оточення (.env)

Створіть файл `.env` в корені проєкту (не комітити секрети). Приклади змінних:

```env
# filepath: .env.example
REACT_APP_API_URL=https://api.example.com
REACT_APP_MAPS_KEY=your_maps_api_key
NODE_ENV=development
```

Перезапустіть dev-сервер після зміни `.env`.

## Структура проекту (коротко)

- public/ — статичні файли
- src/
  - components/ — перезапускаємі UI-компоненти
  - pages/ — маршрути/сторінки
  - services/ — робота з API (axios/fetch)
  - hooks/ — кастомні React-хуки
  - store/ або context/ — менеджмент стану (Redux/Context)
  - styles/ — глобальні стилі або дизайн-система
  - utils/ — утиліти, валідатори
  - App.tsx / index.tsx — точка входу

## Архітектурні рекомендації

- Компоненти: дрібні, тестовані, без побічних ефектів.
- Сторінки: збирають компоненти та підключають дані.
- API: винести логіку запитів у `services/api.ts`.
- State: використовувати Redux Toolkit або Context + hooks; локальний state у компонентах.
- Стилі: CSS Modules, SASS або styled-components — узгодити командно.

## API і авторизація

- Всі запити мають працювати через central API service.
- Зберігайте токени у secure httpOnly cookie або в пам'яті (ні в localStorage для критичних даних), залежно від архітектури бекенду.
- Обробляйте помилки (401 -> редирект на логін; 403 -> показ повідомлення).

## Тестування

- Unit: Jest + React Testing Library.
- Інтеграції: тестувати сервіси API за допомогою msw/mock.
- E2E: Cypress (опціонально). Приклад запуску:

```bash
npm test
# або
yarn test
```

## Лінтинг і форматування

- Рекомендується ESLint + Prettier.
- Додайте husky + lint-staged для перевірки у pre-commit.

## Білд і деплой

- `npm run build` згенерує production-папку `build`.
- Деплой на:
  - Vercel / Netlify (простий drag & drop або інтеграція через репозиторій).
  - Docker: створіть Dockerfile, який виконує `npm run build` та сервер для статичних файлів (nginx або serve). Приклад Dockerfile (огляд):

```dockerfile
# Multistage build
FROM node:16 as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:stable-alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Безпека

- Не комітьте `.env` з секретами.
- Валідуйте і санітизовуйте всі дані з бекенду.
- Використовуйте HTTPS у production.

## Поради щодо відлагодження

- Перевірте консоль браузера та мережеві запити (DevTools).
- Якщо `npm start` видає помилки після зміни `.env`, перезапустіть dev-сервер.
- Проблеми з портом 3000: вказати інший через `PORT` в `.env` або змінити у скриптах.

## Контриб'юція

- Форк -> feature branch -> PR.
- Дотримуйтесь стилю коду (ESLint/Prettier).
- Пишіть короткий і зрозумілий опис PR та чек-лист змін.
- Додавайте тести для нової логіки.

## Часті помилки

- Застарілі пакети: оновлюйте через `npm outdated`.
- Конфлікти стилів: перевірте порядок імпорту CSS.
- Проблеми з кешем: `rm -rf node_modules && npm i` або `npm cache clean --force`.

## Контакти та ліцензія

- Підтримка: вказати internal email або github issues.
- Ліцензія: вкажіть тип ліцензії у файлі LICENSE (MIT/ISC тощо).

## Додаткові ресурси

- React: https://reactjs.org
- CRA docs: https://create-react-app.dev
- Redux Toolkit: https://redux-toolkit.js.org
- React Testing Library: https://testing-library.com/react

## Оновлення README

Оновлюйте цей файл при зміні структури, нових скриптів або налаштувань оточення.
