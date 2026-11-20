"use strict";

(() => {
  const english = {
    "Brasa з фото: ресторан і бар": "Brasa: restaurant and bar",
    "Brasa, головна": "Brasa, home",
    "РЕСТОРАН · БАР": "RESTAURANT · BAR",
    "Основна навігація": "Main navigation",
    "Головна": "Home",
    "Меню": "Menu",
    "Забронювати столик": "Book a table",
    "Замовити": "Order",
    "Відгуки": "Reviews",
    "Контакти": "Contacts",
    "Увійти": "Log in",
    "Кабінет": "Account",
    "Відкрити кошик": "Open cart",
    "Кошик": "Cart",
    "Відкрити меню": "Open menu",
    "Мобільна навігація": "Mobile navigation",
    "Менеджер": "Manager",
    "Навігаційний ланцюжок": "Breadcrumbs",
    "Мова сайту": "Site language",
    "ВЕЧОРИ, ЯКІ ХОЧЕТЬСЯ ПОВТОРИТИ": "EVENINGS WORTH COMING BACK FOR",
    "Brasa - це": "Brasa brings",
    "затишок, жива музика": "warmth, live music",
    "та смачна їжа": "and delicious food",
    "Атмосфера теплих зустрічей у серці міста.": "A welcoming place to meet in the heart of the city.",
    "Переглянути меню": "Explore the menu",
    "КИЇВ · РЕСТОРАН І БАР": "KYIV · RESTAURANT AND BAR",
    "СТВОРЕНО ДЛЯ ЗУСТРІЧЕЙ": "MADE FOR GETTING TOGETHER",
    "СМАК BRASA · МЕНЮ З ФОТО": "TASTE BRASA · OUR MENU",
    "Наше меню": "Our menu",
    "Улюблені смаки для неспішного вечора.": "Favourite flavours for a relaxed evening.",
    "Додати страву": "Add a dish",
    "Категорії страв": "Menu categories",
    "Усе меню": "Full menu",
    "Закуски": "Starters",
    "Основні": "Main courses",
    "Десерти": "Desserts",
    "Напої": "Drinks",
    "Пошук у меню": "Search the menu",
    "Пошук страви…": "Search for a dish…",
    "Завантажуємо меню…": "Loading the menu…",
    "Спробувати ще раз": "Try again",
    "За цим запитом страв не знайдено.": "No dishes match your search.",
    "ВАШ ВЕЧІР У BRASA": "YOUR EVENING AT BRASA",
    "Знайдемо для вас": "Let us find you",
    "ідеальний стіл.": "the perfect table.",
    "Оберіть день і час та залиште контактні дані. Заявка збережеться у вашому кабінеті й буде доступна менеджеру.": "Choose a date and time and enter your contact details. Your booking request will appear in your account and be sent to the manager.",
    "Кілька кроків до теплого вечора": "A few steps towards a memorable evening",
    "Дата": "Date",
    "Час": "Time",
    "Оберіть час": "Choose a time",
    "Гостей": "Guests",
    "Кількість гостей": "Number of guests",
    "Ваше ім’я": "Your name",
    "Як до вас звертатися": "What should we call you?",
    "Номер телефону": "Phone number",
    "Побажання": "Special requests",
    "необов’язково": "optional",
    "Наприклад, затишний стіл біля вікна": "For example, a quiet table by the window",
    "Підтвердити бронювання": "Submit booking",
    "Для бронювання потрібен обліковий запис. Менеджер може підтвердити заявку в системі.": "Log in to request a booking. A manager will review your request.",
    "Заявку збережено!": "Booking request saved!",
    "Заповнити ще раз →": "Make another booking →",
    "ЗАМОВЛЕННЯ": "ORDER",
    "Смак, який поруч": "Your next delicious meal",
    "Оберіть страви й зберіть замовлення. Після оформлення воно збережеться в базі даних.": "Choose your dishes and place an order. You can view it in your account.",
    "Перейти до кошика": "Go to cart",
    "ВИБІР ШЕФА": "CHEF’S SELECTION",
    "Зустріч починається зі смаку.": "Good company starts with good food.",
    "Невелика добірка улюблених страв Brasa для вашого вечора.": "A selection of Brasa favourites for your evening.",
    "Шукаєте щось інше?": "Looking for something else?",
    "БУДЬМО НА ЗВ’ЯЗКУ": "GET IN TOUCH",
    "Наші адреси:": "Our locations",
    "м. Київ, вул. Січових Стрільців, 1919": "1919 Sichovykh Striltsiv Street, Kyiv",
    "м. Київ, просп. академіка Вернадського, 5": "5 Akademika Vernadskoho Avenue, Kyiv",
    "м. Київ, вул. Миру, 19": "19 Myru Street, Kyiv",
    "Робочі номери:": "Call us",
    "Наші соцмережі:": "Social media",
    "Посилання на офіційні сторінки можна додати після запуску ресторану.": "Official social media links will be added when the restaurant opens.",
    "Соцмережі, демонстрація": "Social media preview",
    "ДІАЛОГ З ГОСТЯМИ": "GUEST FEEDBACK",
    "Поділіться враженнями, обговоріть відгуки й отримайте відповідь менеджера.": "Share your experience, discuss reviews and hear from our manager.",
    "Завантажуємо відгуки...": "Loading reviews...",
    "ВАША ДУМКА": "YOUR EXPERIENCE",
    "Залишити відгук": "Write a review",
    "Щоб написати відгук, увійдіть до облікового запису.": "Log in to write a review.",
    "Менеджер відповідає на відгуки в панелі керування.": "Managers can reply to reviews in the dashboard.",
    "Оцінка *": "Rating *",
    "Оберіть оцінку": "Choose a rating",
    "5, чудово": "5, excellent",
    "4, добре": "4, good",
    "3, нормально": "3, average",
    "2, є зауваження": "2, below expectations",
    "1, незадовільно": "1, poor",
    "Ваш відгук *": "Your review *",
    "Що вам сподобалося?": "What did you enjoy?",
    "Опублікувати": "Publish",
    "Увійти або зареєструватися →": "Log in or sign up →",
    "ОБЛІКОВИЙ ЗАПИС": "YOUR ACCOUNT",
    "Особистий кабінет": "My account",
    "Зареєструйтеся, щоб залишати відгуки, бронювати столик і переглядати свої замовлення.": "Create an account to write reviews, book a table and view your orders.",
    "Вхід або реєстрація": "Log in or sign up",
    "Реєстрація": "Sign up",
    "Електронна пошта *": "Email address *",
    "Пароль *": "Password *",
    "Показати пароль": "Show password",
    "Ім’я *": "Name *",
    "Олена": "Olena",
    "Від 2 до 80 символів. Можна використовувати літери, пробіли, дефіс і апостроф.": "Use 2 to 80 characters. Letters, spaces, hyphens and apostrophes are allowed.",
    "Введіть свою адресу з одним знаком @ та доменом, наприклад name@example.com. Пробіли в адресі заборонені.": "Enter your email address with one @ and a domain, such as name@example.com. Spaces are not allowed.",
    "Номер телефону *": "Phone number *",
    "Введіть 9 цифр після +380, наприклад (67) 123-45-67. Також можна вставити повний номер із +380 або 0 на початку.": "Enter 9 digits after +380, for example (67) 123-45-67. You can also paste a full Ukrainian number starting with +380 or 0.",
    "Від 8 до 128 символів, щонайменше одна літера й одна цифра від 0 до 9. Спецсимволи дозволені.": "Use 8 to 128 characters with at least one letter and one digit from 0 to 9. Special characters are allowed.",
    "Повторіть пароль *": "Confirm password *",
    "Показати повторно введений пароль": "Show confirmation password",
    "Введіть той самий пароль. Регістр літер і пробіли мають збігатися.": "Enter the same password. Letter case and spaces must match.",
    "Створити обліковий запис": "Create account",
    "Вийти": "Log out",
    "Мої бронювання": "My bookings",
    "Мої замовлення": "My orders",
    "КЕРУВАННЯ": "MANAGEMENT",
    "Панель менеджера": "Manager dashboard",
    "Керування меню, заявками й замовленнями та відповіді на відгуки.": "Manage the menu, bookings and orders, and reply to guest reviews.",
    "Керувати меню": "Manage menu",
    "Бронювання": "Bookings",
    "Замовлення": "Orders",
    "Відгуки та відповіді": "Reviews and replies",
    "ВАШ ВИБІР": "YOUR SELECTION",
    "Закрити кошик": "Close cart",
    "Разом": "Total",
    "Ім’я": "Name",
    "Телефон": "Phone",
    "Оформити замовлення": "Place order",
    "Потрібен вхід до облікового запису. Замовлення збережеться в базі даних, але оплата недоступна.": "Log in to place an order. Your order will be saved. Online payment is unavailable.",
    "МЕНЮ BRASA": "BRASA MENU",
    "Нова страва": "New dish",
    "Закрити форму страви": "Close dish form",
    "Назва страви": "Dish name",
    "Наприклад, брускета з томатами": "For example, tomato bruschetta",
    "Вид страви": "Category",
    "Ціна, грн": "Price, UAH",
    "Опис": "Description",
    "Інгредієнти та особливості страви": "Ingredients and details",
    "Скасувати": "Cancel",
    "Додати до меню": "Add to menu",
    "КЕРУВАННЯ МЕНЮ": "MENU MANAGEMENT",
    "Прибрати страву?": "Remove this dish?",
    "Страва зникне з меню та кошиків. Уже оформлені замовлення збережуться.": "This dish will be removed from the menu and carts. Existing orders will be kept.",
    "Залишити": "Keep dish",
    "Прибрати з меню": "Remove from menu",
    "Фото страви": "Dish photo",
    "Закрити фото страви": "Close dish photo",
    "Знайти фото у Wikimedia Commons": "Find a photo on Wikimedia Commons",
    "Збережіть вибране зображення на комп’ютер і виберіть файл нижче. Підтримуються JPG, PNG і WebP до 3 МБ.": "Save your chosen image and select the file below. JPG, PNG and WebP files up to 3 MB are supported.",
    "Файл зображення": "Image file",
    "Автор і ліцензія (за потреби)": "Author and licence (optional)",
    "Ім’я автора · CC BY 4.0": "Author name · CC BY 4.0",
    "Посилання на джерело (за потреби)": "Source link (optional)",
    "Зберегти фото": "Save photo",
    "Фото ще немає": "No photo yet",
    "Додати": "Add",
    "Знайти або змінити фото": "Find or change photo",
    "Джерело фото ↗": "Photo source ↗",
    "Ваш кошик поки порожній.": "Your cart is empty.",
    "Оберіть щось смачне в меню.": "Choose something delicious from the menu.",
    "Відгуків поки немає.": "No reviews yet.",
    "Поки що відгуків немає. Станьте першим гостем, який поділиться враженнями.": "No reviews yet. Be the first guest to share your experience.",
    "Оберіть оцінку від 1 до 5.": "Choose a rating from 1 to 5.",
    "Відгук має містити від 10 до 1000 символів.": "Your review must contain 10 to 1000 characters.",
    "Записів поки немає.": "No records yet.",
    "Ще немає бронювань.": "No bookings yet.",
    "Ще немає замовлень.": "No orders yet.",
    "Зареєстрований користувач": "Registered customer",
    "Очікує": "Pending",
    "Нове": "New",
    "Підтверджено": "Confirmed",
    "Виконано": "Completed",
    "Скасовано": "Cancelled",
    "Відповідь менеджера": "Manager reply",
    "Напишіть коментар": "Write a comment",
    "Надіслати": "Send",
    "Приховати": "Hide",
    "Показати": "Show",
    "Зберегти відповідь": "Save reply",
    "Вкажіть коректну електронну пошту.": "Enter a valid email address.",
    "Вкажіть пароль.": "Enter your password.",
    "Пароль може містити до 128 символів.": "Your password can contain up to 128 characters.",
    "Введіть ім’я.": "Enter your name.",
    "Ім’я має містити від 2 до 80 символів.": "Your name must contain 2 to 80 characters.",
    "Використовуйте лише літери, пробіли, дефіс і апостроф.": "Use only letters, spaces, hyphens and apostrophes.",
    "Введіть електронну пошту.": "Enter your email address.",
    "Введіть адресу у форматі name@example.com без пробілів.": "Enter an email address such as name@example.com, without spaces.",
    "Введіть номер телефону.": "Enter your phone number.",
    "Введіть 9 цифр після +380 без початкового 0. Наприклад, (67) 123-45-67.": "Enter 9 digits after +380 without a leading 0, for example (67) 123-45-67.",
    "Введіть пароль.": "Enter a password.",
    "Пароль має містити від 8 до 128 символів.": "Your password must contain 8 to 128 characters.",
    "Додайте щонайменше одну літеру й одну цифру від 0 до 9.": "Include at least one letter and one digit from 0 to 9.",
    "Введіть пароль ще раз.": "Enter your password again.",
    "Паролі не збігаються. Перевірте регістр літер і пробіли.": "Passwords do not match. Check letter case and spaces.",
    "Невірна пошта або пароль.": "Incorrect email or password.",
    "Користувач із такою поштою вже існує.": "An account with this email address already exists.",
    "Не вдалося завантажити меню.": "Could not load the menu.",
    "Не вдалося оновити меню.": "Could not update the menu.",
    "Не вдалося виконати дію.": "Could not complete the action.",
    "Сервер повернув некоректну відповідь.": "The server returned an invalid response.",
    "Сервер недоступний. Запустіть сайт через server.py.": "The server is unavailable. Please try again later.",
    "Недоступні страви прибрано з кошика.": "Unavailable dishes have been removed from your cart.",
    "Страву додано до кошика": "Dish added to cart",
    "Страву додано до меню.": "Dish added to the menu.",
    "Страву прибрано з меню.": "Dish removed from the menu.",
    "Фото страви збережено.": "Dish photo saved.",
    "Обліковий запис створено.": "Account created.",
    "Ви увійшли до облікового запису.": "You are logged in.",
    "Ви вийшли з облікового запису.": "You are logged out.",
    "Спочатку увійдіть до облікового запису.": "Please log in first.",
    "Відгук опубліковано.": "Review published.",
    "Коментар додано.": "Comment added.",
    "Відповідь збережено.": "Reply saved.",
    "Статус оновлено.": "Status updated.",
    "Оберіть сьогоднішню або майбутню дату.": "Choose today or a future date.",
    "Оберіть день і час бронювання.": "Choose a booking date and time.",
    "Вкажіть ім’я від 2 до 80 символів.": "Enter a name containing 2 to 80 characters.",
    "Вкажіть коректний номер телефону.": "Enter a valid phone number.",
    "Побажання може містити до 500 символів.": "Special requests can contain up to 500 characters.",
    "Коментар має містити від 2 до 500 символів.": "Comments must contain 2 to 500 characters.",
    "Виберіть зображення розміром до 3 МБ.": "Choose an image up to 3 MB.",
    "Підтримуються зображення JPG, PNG і WebP.": "JPG, PNG and WebP images are supported.",
    "Зображення пошкоджене або його не вдалося відкрити.": "The image is damaged or could not be opened.",
    "Брускета з томатами": "Tomato bruschetta",
    "Хрусткий хліб, стиглі томати, базилік": "Crisp bread, ripe tomatoes, basil",
    "Тартар із яловичини": "Beef tartare",
    "Ніжна яловичина, каперси, грінки": "Tender beef, capers, toast",
    "Салат із печеним буряком": "Roasted beetroot salad",
    "Крем-сир, горіхи, медова заправка": "Cream cheese, walnuts, honey dressing",
    "Стейк на грилі": "Grilled steak",
    "Яловичина, сезонні овочі, соус деміглас": "Beef, seasonal vegetables, demi-glace",
    "Паста з грибами": "Mushroom pasta",
    "Вершковий соус, пармезан, свіжа зелень": "Cream sauce, parmesan, fresh herbs",
    "Лосось із пюре": "Salmon with mashed potatoes",
    "Філе лосося, картопляне пюре, лимон": "Salmon fillet, mashed potatoes, lemon",
    "Чизкейк Brasa": "Brasa cheesecake",
    "Вершковий крем, ягідний соус": "Creamy cheesecake, berry sauce",
    "Шоколадний фондан": "Chocolate fondant",
    "Теплий шоколад, ванільне морозиво": "Warm chocolate, vanilla ice cream",
    "Домашній лимонад": "Homemade lemonade",
    "Лимон, м’ята, легка ігристість": "Lemon, mint, a gentle sparkle",
    "Домашній борщ": "Homemade borscht",
    "Запашний та ситний борщ з буряку, картоплі, зажарки з цибулі, на свиному бульйоні, поверне Вам смак рідного минулого.": "Hearty beetroot and potato borscht with onions in pork broth, inspired by home cooking.",
    "Пюре з курячими котлетами": "Mashed potatoes with chicken patties",
    "Ніжне картопляне пюре з вершковим маслом та котлети на пару доповнять борщ і домашню атмосферу": "Buttery mashed potatoes and steamed chicken patties, a comforting companion to borscht"
  };
  const dynamic = [
    [/^(.+) \| Brasa з фото$/, (_, view) => `${translate(view)} | Brasa`],
    [/^Додати (.+) до кошика$/, (_, dish) => `Add ${translate(dish)} to cart`],
    [/^Прибрати (.+) з меню$/, (_, dish) => `Remove ${translate(dish)} from the menu`],
    [/^Фото страви: (.+)$/, (_, dish) => `Photo of ${translate(dish)}`],
    [/^Зменшити кількість (.+)$/, (_, dish) => `Decrease quantity of ${translate(dish)}`],
    [/^Збільшити кількість (.+)$/, (_, dish) => `Increase quantity of ${translate(dish)}`],
    [/^(.+) за порцію$/, (_, price) => `${price} per serving`],
    [/^Коментарі \((\d+)\)$/, (_, count) => `Comments (${count})`],
    [/^Коментар до відгуку (.+)$/, (_, author) => `Comment on ${author}’s review`],
    [/^Відповідь на відгук (.+)$/, (_, author) => `Reply to ${author}’s review`],
    [/^Статус запису №(\d+)$/, (_, id) => `Status of record #${id}`],
    [/^Користувачів: (\d+)$/, (_, n) => `Users: ${n}`],
    [/^Бронювань: (\d+)$/, (_, n) => `Bookings: ${n}`],
    [/^Замовлень: (\d+)$/, (_, n) => `Orders: ${n}`],
    [/^Відгуків: (\d+)$/, (_, n) => `Reviews: ${n}`],
    [/^Замовлення №(\d+), (.+)$/, (_, id, total) => `Order #${id}, ${total}`],
    [/^Замовлення №(\d+) збережено\. Сума: (.+)\.$/, (_, id, total) => `Order #${id} saved. Total: ${total}.`],
    [/^Заявка №(\d+): (.+) о (.+), (\d+) гостей\. Статус: очікує підтвердження менеджера\.$/, (_, id, date, time, guests) => `Request #${id}: ${date} at ${time}, ${guests} guests. Awaiting manager confirmation.`],
    [/^(.+) о (\d\d:\d\d), (\d+) гостей$/, (_, date, time, guests) => `${date} at ${time}, ${guests} guests`]
  ];
  const attributes = ["placeholder", "aria-label", "title"];
  const originals = new WeakMap();
  const attributeOriginals = new WeakMap();
  const skip = "script, style, code, textarea, [data-i18n-skip], [data-language], .review-body, .review-head strong, .review-comments > p, .manager-reply > p, .manager-review > p, .manager-review > strong, #profileName, #profileEmail, .dish-photo-credit";
  let language = "uk";
  try { if (localStorage.getItem("brasa-language") === "en") language = "en"; } catch {}

  function translate(value) {
    if (language !== "en") return value;
    if (Object.hasOwn(english, value)) return english[value];
    for (const [pattern, replacement] of dynamic) {
      if (pattern.test(value)) return value.replace(pattern, replacement);
    }
    return value;
  }

  function render() {
    observer.disconnect();
    const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.parentElement?.closest(skip)) continue;
      const previous = originals.get(node);
      const source = previous && node.data === previous.rendered ? previous.source : node.data;
      const trimmed = source.trim();
      if (!trimmed) continue;
      const rendered = source.replace(trimmed, translate(trimmed));
      if (node.data !== rendered) node.data = rendered;
      originals.set(node, { source, rendered });
    }
    for (const element of document.querySelectorAll("[placeholder], [aria-label], [title]")) {
      if (element.closest(skip)) continue;
      const saved = attributeOriginals.get(element) || {};
      for (const attribute of attributes) {
        if (!element.hasAttribute(attribute)) continue;
        const value = element.getAttribute(attribute);
        const previous = saved[attribute];
        const source = previous && value === previous.rendered ? previous.source : value;
        const rendered = translate(source);
        if (value !== rendered) element.setAttribute(attribute, rendered);
        saved[attribute] = { source, rendered };
      }
      attributeOriginals.set(element, saved);
    }
    document.documentElement.lang = language;
    document.querySelectorAll("[data-language]").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.language === language));
    });
    observer.observe(document.documentElement, {
      subtree: true, childList: true, characterData: true,
      attributes: true, attributeFilter: attributes
    });
  }

  const observer = new MutationObserver(render);
  window.BrasaI18n = { translate, get language() { return language; } };
  document.querySelectorAll("[data-language]").forEach(button => {
    button.addEventListener("click", () => {
      language = button.dataset.language;
      try { localStorage.setItem("brasa-language", language); } catch {}
      render();
      document.dispatchEvent(new Event("brasa:languagechange"));
    });
  });
  render();
})();
