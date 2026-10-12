# virtual-list

Список на миллион элементов: слева все, справа выбранные с drag & drop. Бэкенд на Express, фронт на React.

## Установка

Нужны Node 26 и pnpm 12. Сервер запускает TypeScript напрямую, собирать его не надо.

```
pnpm install
```

## Запуск

Разработка (api на 3000, фронт на 5173 с прокси на api):

```
pnpm dev
```

Прод, один процесс отдаёт и api, и собранный фронт на http://localhost:3000:

```
pnpm build
pnpm start
```

Тесты и замеры:

```
pnpm test
pnpm bench
```

Переменные окружения сервера (все необязательные): `PORT` (3000), `ADD_INTERVAL_MS` (10000), `RW_INTERVAL_MS` (1000), `MAX_PENDING` (100000).
