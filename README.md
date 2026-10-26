# Personal OS

Personal OS — персональное PWA для планирования дел и ведения тренировок. Проект стартует как модульный монолит: React + TypeScript на клиенте, FastAPI + SQLite на сервере.

Первый вертикальный срез уже включает:

- создание задачи на выбранную дату;
- приоритеты `low`, `medium`, `high`;
- представления «День» и «Список»;
- завершение и возобновление задачи;
- редактирование, удаление и фильтрацию задач;
- тренировки, упражнения, подходы и историю;
- адаптивную PWA-оболочку для iPhone, iPad и MacBook.

## Запуск через Docker

Рекомендуемый способ запуска требует только Docker Desktop:

```bash
docker compose up --build -d
docker compose ps
```

На Mac откройте `http://127.0.0.1:8080`. API и SQLite запускаются внутри Docker; рабочая база хранится в `data/personal_os.db` и не удаляется при `docker compose down`.

Полезные команды:

```bash
docker compose logs -f
docker compose down
docker compose up -d
```

Папка `data/` подключается в контейнер как `/data`, поэтому один и тот же файл доступен приложению и программам просмотра SQLite на Mac. Файлы базы исключены из Git.

### Просмотр рабочей базы

Откройте `data/personal_os.db` через DB Browser for SQLite или TablePlus, по возможности в режиме Read Only. Приложение подключается к этому файлу автоматически — выполнять отдельную команду в терминале при каждом запуске не требуется.

Для ручного изменения данных сначала создайте резервную копию и остановите приложение:

```bash
./scripts/backup-db.sh
docker compose down
```

После завершения изменений снова выполните `docker compose up -d`.

### Резервная копия SQLite

Приложение можно не останавливать. Выполните:

```bash
./scripts/backup-db.sh
```

Согласованный снимок появится в `backups/`. Файлы бэкапов не добавляются в Git.

## Локальная разработка без Docker

Требования: Node.js 22+, Python 3.12+.

### API

```bash
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000
```

API и Swagger будут доступны на `http://localhost:8000` и `http://localhost:8000/docs`.

### Web

В отдельном терминале:

```bash
cd apps/web
npm install
npm run dev
```

На Mac откройте `http://localhost:5173`. Для доступа с iPhone и iPad используйте Tailscale по инструкции ниже.

## Телефон и планшет через Tailscale

Общая Wi-Fi сеть не требуется: Mac, телефон и планшет должны быть подключены к интернету, авторизованы в одном tailnet и иметь включённый Tailscale.

Сначала запустите Docker Compose. Затем проверьте существующие настройки Tailscale Serve:

```bash
tailscale serve status
```

Если порт `443` уже занят другим Serve-приложением, не сбрасывайте его конфигурацию. Опубликуйте Personal OS на отдельном HTTPS-порту:

```bash
tailscale serve --bg --https=8443 8080
```

Откройте выданный адрес вида `https://<имя-mac>.<tailnet>.ts.net:8443` на Mac, телефоне и планшете. Все устройства будут работать с одной SQLite на Mac через один API. Отключить только эту публикацию можно командой:

```bash
tailscale serve --https=8443 off
```

### Проверка общей базы

1. На Mac создайте задачу «Проверка трёх устройств».
2. На телефоне обновите страницу, найдите эту задачу и отметьте её выполненной.
3. На планшете обновите страницу и убедитесь, что задача отображается выполненной.
4. Выполните `docker compose restart`, снова откройте приложение и убедитесь, что задача сохранилась.

Это проверяет текущую централизованную схему: все устройства работают с одним API и одной SQLite на Mac. Автономная работа при выключенном Mac и последующая синхронизация относятся к более позднему офлайн-релизу.

Для локальной разработки без Docker запустите dev-сервер в одном терминале:

```bash
cd apps/web
npm run dev
```

В другом терминале опубликуйте его на свободном HTTPS-порту:

```bash
tailscale serve --https=8444 5173
```

## Проверки

```bash
cd apps/api && pytest
cd apps/web && npm run build
```

## Структура

```text
apps/
  api/                 FastAPI-приложение и SQLite
  web/                 React PWA
data/                  рабочая SQLite, исключённая из Git
docs/
  product-context.md   продуктовый контекст для следующих сессий
  roadmap.md           небольшие этапы v0.1–v0.6
  frontend-master-spec.md  master-spec клиентского приложения
  backend-master-spec.md   master-spec API, данных и бэкапов
```

