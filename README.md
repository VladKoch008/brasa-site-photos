# Brasa з фото

Brasa з ілюстраціями страв. Сервер працює на Python 3.11+ і зберігає дані в SQLite. Початкове меню та фото містяться в каталозі `seed` і статичних ресурсах сайту.

## Ролі

- Гість переглядає меню, контакти й відгуки, додає страви до кошика, реєструється та входить.
- Зареєстрований користувач може бронювати столики, оформляти замовлення, писати відгуки й коментарі та бачити власні бронювання і замовлення.
- Менеджер переглядає заявки й замовлення, змінює їхні статуси, відповідає на відгуки та керує їхньою видимістю.
Менеджер також керує меню: кнопка «+» у розділі «Меню» відкриває форму назви, виду страви, опису та ціни. Кнопка «−» на картці прибирає страву з меню після підтвердження. Історія вже оформлених замовлень зберігається.

Кнопка з камерою на картці відкриває пошук у Wikimedia Commons за назвою страви. Збережіть потрібне зображення на комп’ютер і завантажте його у формі. Підтримуються JPG, PNG та WebP розміром до 3 МБ. Для фото з Commons можна вказати автора, ліцензію та посилання на сторінку файлу. Завантажене фото відображається в меню та в розділі замовлення.

Права перевіряє сервер. У формі самостійної реєстрації створюється лише роль користувача. Обліковий запис менеджера створюється окремою локальною командою.

## Запуск

У PowerShell відкрийте папку `brasa-site-photos` і виконайте команду.

```powershell
py -3 server.py serve
```

Відкрийте [меню Brasa з фото](http://127.0.0.1:8001/#menu).

Для керування фото створіть менеджера в цій копії. В іншому вікні PowerShell відкрийте ту саму папку й виконайте команду зі своїми даними.

```powershell
py -3 server.py create-manager --name "Менеджер Brasa" --email "manager@example.com" --phone "+380991112233"
```

Введіть пароль, коли консоль його попросить, і увійдіть у копію сайту.

## Хостинг на Render

У Render виберіть **New → Blueprint**, підключіть відповідний репозиторій GitHub і застосуйте `render.yaml`. Після успішного розгортання відкрийте адресу сервісу, яку покаже Render. Сервер слухає порт із змінної `PORT`, а HTTPS забезпечує Render.

Шаблон використовує тариф Free для демонстрації. На ньому SQLite-файл разом із новими акаунтами, замовленнями, відгуками й фото скидається після перезапуску або переходу сервісу в сон.

Щоб створювати менеджера автоматично після запуску, додайте змінну `BRASA_MANAGER_BOOTSTRAP` у розділі **Environment** вебсервісу Render. Її значенням має бути JSON-об’єкт із полями `name`, `email`, `phone` і `password_hash`. Хеш можна підготувати локально через `server.hash_password`, ввівши пароль через `getpass.getpass()`. Зберігайте значення змінної в Render. Сервер створить менеджера зі вказаною поштою, якщо вона вільна. Для наявного акаунта з цією поштою зберігаються його роль і пароль.

Для збереження даних виберіть платний вебсервіс із диском, змонтованим у `/var/data`, та задайте `BRASA_PHOTOS_DB_PATH=/var/data/brasa.sqlite3`. Менеджера можна створити командою `python server.py create-manager` з аргументами вище в Shell вебсервісу. Див. [інструкцію Render для дисків](https://render.com/docs/disks).

## Дані та перевірка

Структуру бази описано в `schema.sql`. При створенні нової бази сервер завантажує 11 позицій початкового меню з `seed/menu.json`. Наявні бази зберігають свій каталог. Меню в навігації, картках і кошику завантажується через `/api/menu`. Ціни зберігаються в цілих копійках. Сервер рахує суму замовлення за актуальними цінами та перевіряє доступність страв.

Форми перевіряють дані в браузері й повторно на сервері. Додавання та прибирання страв доступні лише менеджеру; сервер перевіряє роль незалежно від видимості кнопок. Паролі зберігаються як PBKDF2-хеші з випадковою сіллю, сесії зберігають лише хеш токена.

## Початкові фото

Початкові ілюстрації створено вбудованим ImageGen. Спільний файл `dist/assets/brasa-food-atlas.png` містить окремий кадр для кожної страви. Завантаження менеджера зберігаються в `data/brasa.sqlite3`.

<details>
<summary>Промпт ImageGen</summary>

Create one square restaurant food photography sprite atlas asset. Precisely 3 equal-width columns by 4 equal-height rows, twelve edge-to-edge landscape photo tiles with absolutely straight dividing lines at 1/3 and 2/3 width and 1/4, 1/2 and 3/4 height. No margins, gutters, framing, text, labels or letters. Each tile is a standalone art-directed photorealistic food photograph with its dish centered in its own frame and clear at small website thumbnail size. Cohesive elegant Kyiv restaurant mood: deep walnut tabletop, matte dark stoneware, low warm directional light, restrained garnishing, natural contrast, no people. Row 1 left to right: three toasted tomato and basil bruschettas; finely chopped raw beef tartare with capers and thin toast; roasted beet salad with cream cheese and walnuts. Row 2 left to right: grilled beef steak with seasonal vegetables and glossy jus; creamy tagliatelle with sauteed mushrooms and parmesan; seared salmon fillet with mashed potatoes and lemon. Row 3 left to right: slice of creamy cheesecake with berry sauce; small dark chocolate lava fondant cake with vanilla ice cream; a tall glass of sparkling lemon mint lemonade with ice. Row 4 left to right: dark bowl of Ukrainian beet borscht, crimson broth with potatoes, a dollop of sour cream and dill; rustic bread and butter; dark cup of black coffee. Keep each food composition entirely separate within its designated rectangular cell. Attractive editorial food photography, authentic appetizing dishes, matching amber-toned atmosphere across all twelve scenes.

</details>
