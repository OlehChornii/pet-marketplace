# Pet Marketplace — Документація проекту

Короткий огляд
- Монорепозиторій з клієнтом (React) та бекендом (Express + PostgreSQL).
- Основні модулі: чат, оголошення тварин, адопції, аналітика, платежі.
- OpenAPI специфікація: [server/openapi.yaml](server/openapi.yaml).

Швидкий старт (локально)
1. Встановити залежності
   - Сервер:
     ```sh
     cd server
     npm install
     ```
   - Клієнт:
     ```sh
     cd client
     npm install
     ```
2. Налаштувати змінні оточення
   - Сервер: створити `server/.env` з змінними оточення `PORT,CLIENT_URL,ALLOWED_ORIGINS,DB_HOST,DB_PORT,DB_NAME,DB_PASSWORD,JWT_SECRET,SESSION_SECRET,REFRESH_TOKEN_EXPIRY,HUGGINGFACE_API_KEY,HUGGINGFACE_MODEL,STRIPE_SECRET_KEY,STRIPE_PUBLISHABLE_KEY`.
   - Клієнт: створити `client/.env` і зазначити `REACT_APP_API_URL`.
3. Запустити у двох терміналах
   - Сервер:
     ```sh
     cd server
     npm start
     ```
     Точка запуску: [`server/src/server.js`](server/src/server.js).
   - Клієнт:
     ```sh
     cd client
     npm start
     ```
     Точка входу: [`client/src/index.js`](client/src/index.js).

Білд фронтенду
```sh
cd client
npm run build
```
Результат збірки: `client/build/` (статичні файли).

Архітектура — важливі файли та символи
- Сервер (Express)
  - Вхід/конфіг: [`server/src/app.js`](server/src/app.js) — middleware, CORS, Helmet, сесії, роутинг.
  - Сервер: [`server/src/server.js`](server/src/server.js).
  - Роутинг: папка — [`server/src/routes/`](server/src/routes). Приклади: [`server/src/routes/chat.js`](server/src/routes/chat.js), [`server/src/routes/analytics.js`](server/src/routes/analytics.js), [`server/src/routes/adoptions.js`](server/src/routes/adoptions.js).
  - Контролери: [`server/src/controllers/`](server/src/controllers). Головні:
    - [`adoptionsController`](server/src/controllers/adoptionsController.js)
    - [`analyticsController`](server/src/controllers/analyticsController.js)
  - Сервіси:
    - Аналітика: клас [`AnalyticsService`](server/src/services/analyticsService.js) — реалізує запис у JSON, агрегати, timeseries, виявлення трендів. Файл: [server/src/services/analyticsService.js](server/src/services/analyticsService.js).
    - AI: клас [`AIService`](server/src/services/aiService.js) — LLM/HF виклики, рекомендації. Файл: [server/src/services/aiService.js](server/src/services/aiService.js).
    - Інтелект: [`IntelligenceEngine`](server/src/services/intelligenceEngine.js) — оркестрація обробки чат-запитів. Файл: [server/src/services/intelligenceEngine.js](server/src/services/intelligenceEngine.js).
    - NLP: [`NLPService`](server/src/services/nlpService.js) — простий аналіз запитів/настроїв. Файл: [server/src/services/nlpService.js](server/src/services/nlpService.js).
  - Middleware:
    - Логування запитів у аналітику: [`requestLogger`](server/src/middleware/requestLogger.js). Файл: [server/src/middleware/requestLogger.js](server/src/middleware/requestLogger.js).
    - Auth: [`server/src/middleware/auth.js`](server/src/middleware/auth.js).
  - Конфіг бази: [`server/src/config/database.js`](server/src/config/database.js).
  - Логи / дані:
    - Аналітика: [`server/data/analytics.json`](server/data/analytics.json), агрегати: [`server/data/analytics_aggregates.json`](server/data/analytics_aggregates.json).
    - Чат: [`server/data/chat_messages.json`](server/data/chat_messages.json).

- Клієнт (React)
  - Точка входу: [`client/src/index.js`](client/src/index.js).
  - Головний компонент: [`client/src/App.jsx`](client/src/App.jsx).
  - HTTP wrapper та API файли: [`client/src/services/api.js`](client/src/services/api.js).
    - Важливі експортовані функції/об'єкти:
      - [`getAnalyticsOverview`](client/src/services/api.js)
      - [`getAnalyticsTimeseries`](client/src/services/api.js)
      - [`getAnalyticsTopEndpoints`](client/src/services/api.js)
      - [`adoptionAPI.createApplication`](client/src/services/api.js)
      - [`adoptionAPI.checkExistingApplication`](client/src/services/api.js)
    - Файл: [client/src/services/api.js](client/src/services/api.js).
  - Компоненти / сторінки:
    - Чат: [`client/src/components/ChatBot.jsx`](client/src/components/ChatBot.jsx)
    - Рекомендації: [`client/src/pages/PetRecommendation.jsx`](client/src/pages/PetRecommendation.jsx)
    - Адопції: [`client/src/pages/Adopt/AdoptDetail.jsx`](client/src/pages/Adopt/AdoptDetail.jsx)
    - Адмін дашборд: [`client/src/pages/Admin/Dashboard.jsx`](client/src/pages/Admin/Dashboard.jsx)
    - Сторінки тварин: приклади — [`client/src/pages/Dogs/DogDetail.jsx`](client/src/pages/Dogs/DogDetail.jsx), [`client/src/pages/Cats/CatDetail.jsx`](client/src/pages/Cats/CatDetail.jsx), [`client/src/pages/Others/OtherDetail.jsx`](client/src/pages/Others/OtherDetail.jsx).

OpenAPI / API
- Повна схема: [server/openapi.yaml](server/openapi.yaml).
- Ключові ендпоїнти (приклади з OpenAPI):
  - Чат: `GET/POST /api/chat` — специфікація в [server/openapi.yaml](server/openapi.yaml).
  - Адопції: `POST /api/adoptions` (створення заявки) — бекенд реалізація в [`server/src/controllers/adoptionsController.js`](server/src/controllers/adoptionsController.js).
  - Аналітика (адмін): `GET /api/admin/analytics/overview` і `GET /api/admin/analytics/timeseries` — контролер: [`server/src/controllers/analyticsController.js`](server/src/controllers/analyticsController.js). Клієнт викликає через [`getAnalyticsOverview`](client/src/services/api.js) та [`getAnalyticsTimeseries`](client/src/services/api.js).

Безпека та конфігурація
- Helmet CSP налаштований у [`server/src/app.js`](server/src/app.js).
- CORS контролюється через `ALLOWED_ORIGINS` у [`server/src/app.js`](server/src/app.js).
- Сесії зберігаються в Postgres через `connect-pg-simple` (конфіг в [`server/src/app.js`](server/src/app.js)).
- Rate limiter — функція `createLimiter` у [`server/src/app.js`](server/src/app.js).
- Stripe/webhook:
  - Webhook route: `/api/payments/webhook` (реєстрація в `app.js`, маршрут: [`server/src/routes/payments.js`](server/src/routes/payments.js)).
  - Статус webhook: `/api/payments/webhook-status` (див. `app.js`).

Потоки даних / важливі сценарії
- Створення заявки на всиновлення:
  - Фронтенд: форма в [`client/src/pages/Adopt/AdoptDetail.jsx`](client/src/pages/Adopt/AdoptDetail.jsx) викликає [`adoptionAPI.createApplication`](client/src/services/api.js).
  - Бекенд: обробка в [`server/src/controllers/adoptionsController.js`](server/src/controllers/adoptionsController.js) — валідації, перевірка статусу тварини та вставка в БД.
- Чат-бот:
  - UI: [`client/src/components/ChatBot.jsx`](client/src/components/ChatBot.jsx) — надсилає запит на `/api/chat/query`.
  - Сервер: маршрут [`server/src/routes/chat.js`](server/src/routes/chat.js) викликає [`IntelligenceEngine.processQuery`](server/src/services/intelligenceEngine.js) і [`AIService`](server/src/services/aiService.js) / [`NLPService`](server/src/services/nlpService.js) для класифікації/обробки.
- Аналітика:
  - Middleware [`requestLogger`](server/src/middleware/requestLogger.js) збирає entry і викликає [`AnalyticsService.record`](server/src/services/analyticsService.js).
  - Аналітичні API: [`analyticsController.overview`](server/src/controllers/analyticsController.js) і [`AnalyticsService.getTimeseries`](server/src/services/analyticsService.js).

Журнали та відновлення даних
- Логер: [`server/src/utils/logger.js`](server/src/utils/logger.js).
- Логи зберігаються в: `server/logs/`.

Розгортання
- Backend: Dockerize або запуск Node (див. `server/src/server.js`). Забезпечити змінні оточення (`DATABASE_URL`, `SESSION_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ALLOWED_ORIGINS`).
- Frontend: `npm run build` у `client` -> розгорнути `client/build` на CDN / web server або віддати через сервер.

Нотатки для розробника / дебаг
- Переконайтесь, що ENV містить `REACT_APP_API_URL` якщо фронтенд має звертатись не відносно.
- Для перевірки Stripe webhook локально: `stripe listen --forward-to localhost:5000/api/payments/webhook` (додатково див. `app.js` і маршрут webhook).
- Якщо аналітика порожня — перевірити права запису над `server/data/` та логи (`server/logs/`).

Корисні посилання у репозиторії
- OpenAPI: [server/openapi.yaml](server/openapi.yaml)
- Серверний App: [server/src/app.js](server/src/app.js)
- Серверний Entrypoint: [server/src/server.js](server/src/server.js)
- Analytics service: [`AnalyticsService`](server/src/services/analyticsService.js) — [server/src/services/analyticsService.js](server/src/services/analyticsService.js)
- AI service: [`AIService`](server/src/services/aiService.js) — [server/src/services/aiService.js](server/src/services/aiService.js)
- Intelligence engine: [`IntelligenceEngine`](server/src/services/intelligenceEngine.js) — [server/src/services/intelligenceEngine.js](server/src/services/intelligenceEngine.js)
- Request logger middleware: [`requestLogger`](server/src/middleware/requestLogger.js) — [server/src/middleware/requestLogger.js](server/src/middleware/requestLogger.js)
- Adoptions controller: [server/src/controllers/adoptionsController.js](server/src/controllers/adoptionsController.js)
- API client (frontend): [client/src/services/api.js](client/src/services/api.js) — експортовані утиліти, наприклад [`getAnalyticsOverview`](client/src/services/api.js)
- Chat UI: [client/src/components/ChatBot.jsx](client/src/components/ChatBot.jsx)
- Рекомендації: [client/src/pages/PetRecommendation.jsx](client/src/pages/PetRecommendation.jsx)
- Adopt detail (фронтенд): [client/src/pages/Adopt/AdoptDetail.jsx](client/src/pages/Adopt/AdoptDetail.jsx)

-----
Цей README цілиться дати швидкий огляд і карту коду — для детальної інформації відкрийте вказані файли.