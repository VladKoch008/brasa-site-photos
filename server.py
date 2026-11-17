"""Brasa server with SQLite-backed accounts, bookings, orders and reviews."""

from __future__ import annotations

import argparse
import base64
import getpass
import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
from contextlib import contextmanager
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation
from http import cookies
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from unicodedata import category
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist"
DB_PATH = Path(os.environ.get("BRASA_PHOTOS_DB_PATH", ROOT / "data" / "brasa.sqlite3"))
COOKIE_NAME = "brasa_photos_session"
SECURE_COOKIES = os.environ.get("BRASA_SECURE_COOKIES") == "1"
PHOTO_LIMIT = 3 * 1024 * 1024
SESSION_DAYS = 7
PASSWORD_ITERATIONS = 600_000
EMAIL_RE = re.compile(r"^[^@\s]{1,64}@[^@\s]{1,190}\.[^@\s]{2,}$")
PHONE_RE = re.compile(r"^\+?[\d\s()\-]{10,22}$")
VISIT_TIMES = {"12:00", "13:00", "14:00", "17:00", "18:00", "19:00", "20:00", "21:00"}
CATEGORIES = {
    "starters": "Закуски", "mains": "Основні", "desserts": "Десерти", "drinks": "Напої",
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def connect_db() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA busy_timeout = 10000")
    return connection


@contextmanager
def database():
    connection = connect_db()
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def init_db() -> None:
    with database() as connection:
        has_menu = connection.execute("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'dishes'").fetchone()
        schema = (ROOT / "schema.sql").read_text(encoding="utf-8")
        connection.executescript("BEGIN IMMEDIATE;\n" + schema)
        if not has_menu:
            seed = ROOT / "seed"
            for dish in json.loads((seed / "menu.json").read_text(encoding="utf-8")):
                connection.execute(
                    "INSERT OR IGNORE INTO dishes (id, name, category, description, price_kopecks, created_at) "
                    "VALUES (?, ?, ?, ?, ?, ?)",
                    (dish["id"], dish["name"], dish["category"], dish["description"], dish["price_kopecks"], now_iso()),
                )
                if photo := dish.get("photo"):
                    connection.execute(
                        "INSERT OR IGNORE INTO dish_photos (dish_id, mime, image, revision, credit, source) "
                        "VALUES (?, ?, ?, ?, ?, ?)",
                        (dish["id"], photo["mime"], (seed / photo["file"]).read_bytes(),
                         photo["revision"], photo["credit"], photo["source"]),
                    )
        connection.execute("DELETE FROM sessions WHERE expires_at <= ?", (now_iso(),))


def public_dish(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"], "name": row["name"], "category": row["category"],
        "categoryName": CATEGORIES[row["category"]], "detail": row["description"],
        "price": row["price_kopecks"] / 100,
    }


def price_kopecks(value) -> int:
    if isinstance(value, bool) or not isinstance(value, (str, int, float)):
        raise ValueError("Вкажіть коректну ціну.")
    try:
        price = Decimal(str(value).replace(",", "."))
        if not price.is_finite() or not Decimal("0.01") <= price <= Decimal("100000") or price != price.quantize(Decimal("0.01")):
            raise ValueError("Ціна має бути від 0,01 до 100 000 грн, не більше двох знаків після коми.")
        return int(price * 100)
    except InvalidOperation:
        raise ValueError("Вкажіть коректну ціну.") from None


def dish_photo_payload(data: dict) -> tuple[str, bytes, str, str]:
    try:
        image = base64.b64decode(data.get("image", ""), validate=True)
    except (TypeError, ValueError):
        raise ValueError("Файл фото не вдалося прочитати.") from None
    if not 0 < len(image) <= PHOTO_LIMIT:
        raise ValueError("Виберіть зображення розміром до 3 МБ.")
    if image.startswith(b"\xff\xd8\xff"):
        mime = "image/jpeg"
    elif image.startswith(b"\x89PNG\r\n\x1a\n"):
        mime = "image/png"
    elif image.startswith(b"RIFF") and image[8:12] == b"WEBP":
        mime = "image/webp"
    else:
        raise ValueError("Підтримуються зображення JPG, PNG і WebP.")

    credit = clean_text(data.get("credit", ""), 0, 180, "Автор і ліцензія")
    source = clean_text(data.get("source", ""), 0, 2048, "Посилання на джерело")
    if source:
        parsed = urlsplit(source)
        if parsed.scheme != "https" or not parsed.hostname or parsed.username is not None or re.search(r"\s", source):
            raise ValueError("Вкажіть HTTPS-посилання на сторінку зображення.")
    return mime, image, credit, source


def clean_text(value, minimum: int, maximum: int, label: str) -> str:
    if not isinstance(value, str):
        raise ValueError(f"{label}: введіть текст.")
    text = value.strip()
    if not minimum <= len(text) <= maximum:
        raise ValueError(f"{label}: допустимо від {minimum} до {maximum} символів.")
    return text


def valid_name(value) -> str:
    return clean_text(value, 2, 80, "Ім’я")


def valid_email(value) -> str:
    if not isinstance(value, str):
        raise ValueError("Вкажіть електронну пошту.")
    email = value.strip().lower()
    if len(email) > 254 or not EMAIL_RE.fullmatch(email):
        raise ValueError("Вкажіть коректну електронну пошту.")
    return email


def valid_phone(value) -> str:
    if not isinstance(value, str):
        raise ValueError("Вкажіть номер телефону.")
    phone = value.strip()
    digits = re.sub(r"\D", "", phone)
    if not PHONE_RE.fullmatch(phone) or not 10 <= len(digits) <= 15:
        raise ValueError("Вкажіть коректний номер телефону.")
    return phone


def valid_password(value) -> str:
    if not isinstance(value, str) or not 8 <= len(value) <= 128:
        raise ValueError("Пароль має містити від 8 до 128 символів.")
    if not any(char.isalpha() for char in value) or not any(char.isdigit() for char in value):
        raise ValueError("Пароль має містити літери та цифри.")
    return value


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS)
    return f"pbkdf2_sha256${PASSWORD_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algorithm, count, salt, expected = stored.split("$")
        if algorithm != "pbkdf2_sha256" or not 100_000 <= int(count) <= 2_000_000:
            return False
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), int(count))
        return hmac.compare_digest(actual, bytes.fromhex(expected))
    except (ValueError, TypeError):
        return False


def public_user(row: sqlite3.Row) -> dict:
    return {"id": row["id"], "name": row["name"], "email": row["email"], "phone": row["phone"], "role": row["role"]}


def create_session(connection: sqlite3.Connection, user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    expires = (datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS)).isoformat(timespec="seconds")
    connection.execute(
        "INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
        (hashlib.sha256(token.encode()).hexdigest(), user_id, expires, now_iso()),
    )
    return token


class BrasaHandler(SimpleHTTPRequestHandler):
    timeout = 15

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST), **kwargs)

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        super().end_headers()

    def send_json(self, status: int, payload: dict | list, cookie: str | None = None) -> None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        if cookie:
            self.send_header("Set-Cookie", cookie)
        self.end_headers()
        self.wfile.write(data)

    def fail(self, status: int, message: str) -> None:
        self.send_json(status, {"error": message})

    def session_token(self) -> str | None:
        jar = cookies.SimpleCookie()
        try:
            jar.load(self.headers.get("Cookie", ""))
            return jar[COOKIE_NAME].value if COOKIE_NAME in jar else None
        except cookies.CookieError:
            return None

    def current_user(self) -> sqlite3.Row | None:
        token = self.session_token()
        if not token:
            return None
        with database() as connection:
            return connection.execute(
                "SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?",
                (hashlib.sha256(token.encode()).hexdigest(), now_iso()),
            ).fetchone()

    def require_user(self, manager: bool = False) -> sqlite3.Row | None:
        user = self.current_user()
        if not user:
            self.fail(401, "Увійдіть до облікового запису.")
            return None
        if manager and user["role"] != "manager":
            self.fail(403, "Ця дія доступна лише менеджеру.")
            return None
        return user

    def read_json(self, max_length: int = 200_000) -> dict:
        if self.headers.get("Content-Type", "").split(";")[0].strip().lower() != "application/json":
            raise ValueError("Надішліть дані у форматі JSON.")
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            raise ValueError("Некоректний розмір запиту.") from None
        if not 1 <= length <= max_length:
            raise ValueError("Некоректний розмір запиту.")
        try:
            data = json.loads(self.rfile.read(length))
        except (json.JSONDecodeError, UnicodeDecodeError):
            raise ValueError("Некоректний JSON.") from None
        if not isinstance(data, dict):
            raise ValueError("Очікується об’єкт JSON.")
        return data

    def cookie_header(self, token: str | None) -> str:
        flags = "HttpOnly; Path=/; SameSite=Strict"
        if SECURE_COOKIES:
            flags += "; Secure"
        max_age = SESSION_DAYS * 86400 if token else 0
        return f"{COOKIE_NAME}={token or ''}; {flags}; Max-Age={max_age}"

    def do_GET(self):
        path = urlsplit(self.path).path
        if not path.startswith("/api/"):
            return super().do_GET()
        if path == "/api/menu":
            with database() as connection:
                rows = connection.execute(
                    "SELECT d.*, p.revision, p.credit, p.source FROM dishes d "
                    "LEFT JOIN dish_photos p ON p.dish_id = d.id WHERE d.is_active = 1 ORDER BY d.rowid"
                )
                dishes = []
                for row in rows:
                    dish = public_dish(row)
                    if row["revision"]:
                        dish["photo"] = {
                            "url": f"/api/menu/{row['id']}/photo?v={row['revision']}",
                            "credit": row["credit"], "source": row["source"],
                        }
                    dishes.append(dish)
            return self.send_json(200, {"dishes": dishes})
        photo = re.fullmatch(r"/api/menu/([a-z0-9_-]{1,80})/photo", path)
        if photo:
            return self.get_dish_photo(photo.group(1))
        if path == "/api/me":
            user = self.current_user()
            return self.send_json(200, {"user": public_user(user) if user else None})
        if path == "/api/reviews":
            return self.get_reviews()
        if path == "/api/my/bookings":
            return self.get_my_records("bookings")
        if path == "/api/my/orders":
            return self.get_my_records("orders")
        if path == "/api/manager/overview":
            return self.get_manager_overview()
        self.fail(404, "Сторінку не знайдено.")

    def do_POST(self):
        path = urlsplit(self.path).path
        if not path.startswith("/api/"):
            return self.fail(404, "Сторінку не знайдено.")
        origin = self.headers.get("Origin")
        if origin:
            parsed = urlsplit(origin)
            if parsed.scheme not in ("http", "https") or parsed.netloc != self.headers.get("Host"):
                return self.fail(403, "Запит має походити з цього сайту.")
        try:
            photo = re.fullmatch(r"/api/manager/dishes/([a-z0-9_-]{1,80})/photo", path)
            if photo:
                return self.set_dish_photo(photo.group(1))
            data = self.read_json()
            if path == "/api/register":
                return self.register(data)
            if path == "/api/login":
                return self.login(data)
            if path == "/api/logout":
                return self.logout()
            if path == "/api/reviews":
                return self.add_review(data)
            if path == "/api/bookings":
                return self.add_booking(data)
            if path == "/api/orders":
                return self.add_order(data)
            if path == "/api/manager/dishes":
                return self.add_dish(data)
            match = re.fullmatch(r"/api/manager/dishes/([a-z0-9_-]{1,80})/remove", path)
            if match:
                return self.remove_dish(match.group(1))
            match = re.fullmatch(r"/api/reviews/(\d+)/comments", path)
            if match:
                return self.add_comment(int(match.group(1)), data)
            match = re.fullmatch(r"/api/manager/reviews/(\d+)/(reply|visibility)", path)
            if match:
                return self.update_review(int(match.group(1)), match.group(2), data)
            match = re.fullmatch(r"/api/manager/(bookings|orders)/(\d+)/status", path)
            if match:
                return self.update_status(match.group(1), int(match.group(2)), data)
            self.fail(404, "Сторінку не знайдено.")
        except ValueError as error:
            self.fail(400, str(error))

    def register(self, data: dict):
        field = "name"
        try:
            name = valid_name(data.get("name"))
            if not any(char.isalpha() for char in name) or any(
                not (char.isalpha() or category(char).startswith("M") or char in " '’ʼ-")
                for char in name
            ):
                raise ValueError("Використовуйте лише літери, пробіли, дефіс і апостроф.")

            field = "email"
            email = valid_email(data.get("email"))

            field = "phone"
            phone = valid_phone(data.get("phone"))
            digits = re.sub(r"\D", "", phone)
            if not phone.startswith("+") and len(digits) == 10 and digits.startswith("0"):
                digits = "380" + digits[1:]
            if not re.fullmatch(r"380[1-9][0-9]{8}", digits):
                raise ValueError("Введіть український номер у форматі +380 (67) 123-45-67.")
            phone = "+" + digits

            field = "password"
            password = valid_password(data.get("password"))
            if not any(char in "0123456789" for char in password):
                raise ValueError("Додайте щонайменше одну цифру від 0 до 9.")

            field = "password_confirm"
            if data.get("password_confirm") != password:
                raise ValueError("Паролі не збігаються. Перевірте регістр літер і пробіли.")
        except ValueError as issue:
            return self.send_json(400, {"field": field, "error": str(issue)})
        with database() as connection:
            try:
                cursor = connection.execute(
                    "INSERT INTO users (name, email, phone, password_hash, role, created_at) VALUES (?, ?, ?, ?, 'user', ?)",
                    (name, email, phone, hash_password(password), now_iso()),
                )
            except sqlite3.IntegrityError:
                return self.send_json(409, {"field": "email", "error": "Користувач із такою поштою вже існує."})
            token = create_session(connection, cursor.lastrowid)
            user = connection.execute("SELECT * FROM users WHERE id = ?", (cursor.lastrowid,)).fetchone()
        self.send_json(201, {"user": public_user(user)}, self.cookie_header(token))

    def login(self, data: dict):
        email = valid_email(data.get("email"))
        password = data.get("password")
        if not isinstance(password, str) or not 1 <= len(password) <= 128:
            raise ValueError("Вкажіть пароль.")
        with database() as connection:
            user = connection.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
            if not user or not verify_password(password, user["password_hash"]):
                return self.fail(401, "Невірна пошта або пароль.")
            token = create_session(connection, user["id"])
        self.send_json(200, {"user": public_user(user)}, self.cookie_header(token))

    def logout(self):
        token = self.session_token()
        if token:
            with database() as connection:
                connection.execute("DELETE FROM sessions WHERE token_hash = ?", (hashlib.sha256(token.encode()).hexdigest(),))
        self.send_json(200, {"ok": True}, self.cookie_header(None))

    def get_reviews(self):
        with database() as connection:
            reviews = [dict(row) for row in connection.execute(
                "SELECT r.id, r.rating, r.body, r.manager_reply, r.manager_reply_at, r.created_at, u.name AS author "
                "FROM reviews r JOIN users u ON u.id = r.user_id WHERE r.is_visible = 1 ORDER BY r.id DESC LIMIT 50"
            )]
            for review in reviews:
                review["comments"] = [dict(row) for row in connection.execute(
                    "SELECT c.id, c.body, c.created_at, u.name AS author, u.role FROM review_comments c "
                    "JOIN users u ON u.id = c.user_id WHERE c.review_id = ? ORDER BY c.id ASC LIMIT 50", (review["id"],)
                )]
        self.send_json(200, {"reviews": reviews})

    def add_review(self, data: dict):
        user = self.require_user()
        if not user:
            return
        if user["role"] != "user":
            return self.fail(403, "Відгуки публікують зареєстровані користувачі.")
        rating = data.get("rating")
        if type(rating) is not int or not 1 <= rating <= 5:
            raise ValueError("Оберіть оцінку від 1 до 5.")
        body = clean_text(data.get("body"), 10, 1000, "Відгук")
        with database() as connection:
            cursor = connection.execute(
                "INSERT INTO reviews (user_id, rating, body, created_at) VALUES (?, ?, ?, ?)",
                (user["id"], rating, body, now_iso()),
            )
        self.send_json(201, {"id": cursor.lastrowid})

    def add_comment(self, review_id: int, data: dict):
        user = self.require_user()
        if not user:
            return
        body = clean_text(data.get("body"), 2, 500, "Коментар")
        with database() as connection:
            review = connection.execute("SELECT id FROM reviews WHERE id = ? AND is_visible = 1", (review_id,)).fetchone()
            if not review:
                return self.fail(404, "Відгук не знайдено.")
            cursor = connection.execute(
                "INSERT INTO review_comments (review_id, user_id, body, created_at) VALUES (?, ?, ?, ?)",
                (review_id, user["id"], body, now_iso()),
            )
        self.send_json(201, {"id": cursor.lastrowid})

    def add_booking(self, data: dict):
        user = self.require_user()
        if not user:
            return
        try:
            visit_date = date.fromisoformat(data.get("date", ""))
        except (ValueError, TypeError):
            raise ValueError("Оберіть коректну дату.") from None
        if visit_date < date.today():
            raise ValueError("Оберіть сьогоднішню або майбутню дату.")
        visit_time = data.get("time")
        if visit_time not in VISIT_TIMES:
            raise ValueError("Оберіть час зі списку.")
        guests = data.get("guests")
        if isinstance(guests, bool) or not isinstance(guests, (int, str)) or not str(guests).isdigit():
            raise ValueError("Оберіть кількість гостей.") from None
        guests = int(guests)
        if not 1 <= guests <= 8:
            raise ValueError("Можна забронювати стіл для 1-8 гостей.")
        name = valid_name(data.get("name"))
        phone = valid_phone(data.get("phone"))
        note = clean_text(data.get("comment", ""), 0, 500, "Побажання")
        with database() as connection:
            cursor = connection.execute(
                "INSERT INTO bookings (user_id, visit_date, visit_time, guests, guest_name, phone, note, created_at) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (user["id"], visit_date.isoformat(), visit_time, guests, name, phone, note, now_iso()),
            )
        self.send_json(201, {"id": cursor.lastrowid, "status": "pending"})

    def add_order(self, data: dict):
        user = self.require_user()
        if not user:
            return
        name = valid_name(data.get("name"))
        phone = valid_phone(data.get("phone"))
        items = data.get("items")
        if not isinstance(items, list) or not 1 <= len(items) <= 30:
            raise ValueError("Додайте страви до кошика.")
        with database() as connection:
            # Read current availability and prices in the same transaction as the order.
            connection.execute("BEGIN IMMEDIATE")
            menu = {row["id"]: row for row in connection.execute("SELECT * FROM dishes WHERE is_active = 1")}
            cleaned = []
            seen = set()
            total_kopecks = 0
            for item in items:
                if not isinstance(item, dict) or not isinstance(item.get("id"), str) or item["id"] not in menu or item["id"] in seen:
                    raise ValueError("Страва більше недоступна. Оновіть меню та перевірте кошик.")
                quantity = item.get("quantity")
                if type(quantity) is not int or not 1 <= quantity <= 99:
                    raise ValueError("Некоректна кількість страв.")
                dish = menu[item["id"]]
                seen.add(dish["id"])
                total_kopecks += dish["price_kopecks"] * quantity
                cleaned.append((dish["id"], dish["name"], dish["price_kopecks"] / 100, quantity))
            total = total_kopecks / 100
            cursor = connection.execute(
                "INSERT INTO orders (user_id, customer_name, phone, total_uah, created_at) VALUES (?, ?, ?, ?, ?)",
                (user["id"], name, phone, total, now_iso()),
            )
            connection.executemany(
                "INSERT INTO order_items (order_id, dish_id, dish_name, unit_price_uah, quantity) VALUES (?, ?, ?, ?, ?)",
                [(cursor.lastrowid, *item) for item in cleaned],
            )
        self.send_json(201, {"id": cursor.lastrowid, "status": "new", "total_uah": total})

    def add_dish(self, data: dict):
        if not self.require_user(manager=True):
            return
        name = clean_text(data.get("name"), 2, 100, "Назва страви")
        category = data.get("category")
        if not isinstance(category, str) or category not in CATEGORIES:
            raise ValueError("Оберіть вид страви зі списку.")
        description = clean_text(data.get("detail"), 2, 500, "Опис")
        price = price_kopecks(data.get("price"))
        dish_id = secrets.token_hex(12)
        with database() as connection:
            connection.execute(
                "INSERT INTO dishes (id, name, category, description, price_kopecks, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (dish_id, name, category, description, price, now_iso()),
            )
            dish = public_dish(connection.execute("SELECT * FROM dishes WHERE id = ?", (dish_id,)).fetchone())
        self.send_json(201, {"dish": dish})

    def remove_dish(self, dish_id: str):
        if not self.require_user(manager=True):
            return
        with database() as connection:
            cursor = connection.execute("UPDATE dishes SET is_active = 0 WHERE id = ? AND is_active = 1", (dish_id,))
            if not cursor.rowcount:
                return self.fail(404, "Страву вже прибрано з меню.")
        self.send_json(200, {"ok": True})

    def get_dish_photo(self, dish_id: str):
        with database() as connection:
            row = connection.execute(
                "SELECT p.mime, p.image FROM dish_photos p JOIN dishes d ON d.id = p.dish_id "
                "WHERE p.dish_id = ? AND d.is_active = 1", (dish_id,),
            ).fetchone()
        if not row:
            return self.fail(404, "Фото страви не знайдено.")
        self.send_response(200)
        self.send_header("Content-Type", row["mime"])
        self.send_header("Content-Length", str(len(row["image"])))
        self.send_header("Cache-Control", "public, max-age=300")
        self.end_headers()
        self.wfile.write(row["image"])

    def set_dish_photo(self, dish_id: str):
        if not self.require_user(manager=True):
            return
        data = self.read_json(max_length=4 * PHOTO_LIMIT // 3 + 16_384)
        mime, image, credit, source = dish_photo_payload(data)
        with database() as connection:
            connection.execute("BEGIN IMMEDIATE")
            if not connection.execute("SELECT 1 FROM dishes WHERE id = ? AND is_active = 1", (dish_id,)).fetchone():
                return self.fail(404, "Страву не знайдено.")
            connection.execute(
                "INSERT INTO dish_photos (dish_id, mime, image, revision, credit, source) VALUES (?, ?, ?, ?, ?, ?) "
                "ON CONFLICT(dish_id) DO UPDATE SET mime = excluded.mime, image = excluded.image, "
                "revision = excluded.revision, credit = excluded.credit, source = excluded.source",
                (dish_id, mime, image, secrets.token_hex(8), credit, source),
            )
        self.send_json(200, {"ok": True})

    def get_my_records(self, table: str):
        user = self.require_user()
        if not user:
            return
        with database() as connection:
            if table == "bookings":
                rows = [dict(row) for row in connection.execute(
                    "SELECT id, visit_date, visit_time, guests, status, created_at FROM bookings "
                    "WHERE user_id = ? ORDER BY id DESC LIMIT 30", (user["id"],)
                )]
            else:
                rows = [dict(row) for row in connection.execute(
                    "SELECT id, total_uah, status, created_at FROM orders "
                    "WHERE user_id = ? ORDER BY id DESC LIMIT 30", (user["id"],)
                )]
        self.send_json(200, {table: rows})

    def get_manager_overview(self):
        user = self.require_user(manager=True)
        if not user:
            return
        with database() as connection:
            bookings = [dict(row) for row in connection.execute(
                "SELECT b.id, b.visit_date, b.visit_time, b.guests, b.guest_name, b.phone, b.note, b.status, b.created_at, u.email "
                "FROM bookings b JOIN users u ON u.id = b.user_id ORDER BY b.id DESC LIMIT 100"
            )]
            orders = [dict(row) for row in connection.execute(
                "SELECT o.id, o.customer_name, o.phone, o.total_uah, o.status, o.created_at, u.email "
                "FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.id DESC LIMIT 100"
            )]
            for order in orders:
                order["items"] = [dict(row) for row in connection.execute(
                    "SELECT dish_name, unit_price_uah, quantity FROM order_items WHERE order_id = ?", (order["id"],)
                )]
            reviews = [dict(row) for row in connection.execute(
                "SELECT r.id, r.rating, r.body, r.is_visible, r.manager_reply, r.created_at, u.name AS author "
                "FROM reviews r JOIN users u ON u.id = r.user_id ORDER BY r.id DESC LIMIT 100"
            )]
            users_count = connection.execute("SELECT COUNT(*) FROM users WHERE role = 'user'").fetchone()[0]
        self.send_json(200, {"bookings": bookings, "orders": orders, "reviews": reviews, "users_count": users_count})

    def update_review(self, review_id: int, action: str, data: dict):
        user = self.require_user(manager=True)
        if not user:
            return
        with database() as connection:
            exists = connection.execute("SELECT id FROM reviews WHERE id = ?", (review_id,)).fetchone()
            if not exists:
                return self.fail(404, "Відгук не знайдено.")
            if action == "reply":
                reply = clean_text(data.get("reply"), 2, 500, "Відповідь")
                connection.execute("UPDATE reviews SET manager_reply = ?, manager_reply_at = ? WHERE id = ?", (reply, now_iso(), review_id))
            else:
                visible = data.get("visible")
                if type(visible) is not bool:
                    raise ValueError("Вкажіть видимість відгуку.")
                connection.execute("UPDATE reviews SET is_visible = ? WHERE id = ?", (int(visible), review_id))
        self.send_json(200, {"ok": True})

    def update_status(self, table: str, record_id: int, data: dict):
        user = self.require_user(manager=True)
        if not user:
            return
        allowed = {"bookings": {"pending", "confirmed", "cancelled"}, "orders": {"new", "confirmed", "completed", "cancelled"}}
        status = data.get("status")
        if status not in allowed[table]:
            raise ValueError("Оберіть коректний статус.")
        with database() as connection:
            cursor = connection.execute(f"UPDATE {table} SET status = ? WHERE id = ?", (status, record_id))
            if not cursor.rowcount:
                return self.fail(404, "Запис не знайдено.")
        self.send_json(200, {"ok": True})


def insert_manager(connection, name: str, email: str, phone: str, password_hash: str) -> bool:
    cursor = connection.execute(
        "INSERT INTO users (name, email, phone, password_hash, role, created_at) "
        "VALUES (?, ?, ?, ?, 'manager', ?) ON CONFLICT(email) DO NOTHING",
        (name, email, phone, password_hash, now_iso()),
    )
    return cursor.rowcount == 1


def bootstrap_manager() -> None:
    raw_config = os.environ.get("BRASA_MANAGER_BOOTSTRAP")
    if raw_config is None:
        return
    try:
        config = json.loads(raw_config)
        if not isinstance(config, dict):
            raise ValueError
        name = valid_name(config.get("name"))
        email = valid_email(config.get("email"))
        phone = valid_phone(config.get("phone"))
        password_hash = config.get("password_hash")
        match = re.fullmatch(r"pbkdf2_sha256\$(\d{6,7})\$[0-9a-f]{32}\$[0-9a-f]{64}", password_hash or "")
        if not match or not 100_000 <= int(match[1]) <= 2_000_000:
            raise ValueError
    except (ValueError, TypeError):
        raise SystemExit("Некоректні налаштування BRASA_MANAGER_BOOTSTRAP.") from None

    with database() as connection:
        created = insert_manager(connection, name, email, phone, password_hash)
        if not created:
            role = connection.execute("SELECT role FROM users WHERE email = ?", (email,)).fetchone()["role"]
    if created:
        print("Обліковий запис менеджера створено під час запуску.", flush=True)
    elif role != "manager":
        print("Менеджера не створено. Ця пошта належить звичайному користувачу.", flush=True)


def create_manager(args):
    name = valid_name(args.name)
    email = valid_email(args.email)
    phone = valid_phone(args.phone)
    password = valid_password(getpass.getpass("Пароль менеджера: "))
    with database() as connection:
        created = insert_manager(connection, name, email, phone, hash_password(password))
    if not created:
        raise SystemExit("Користувач із такою поштою вже існує.")
    print("Обліковий запис менеджера створено.")


def main():
    parser = argparse.ArgumentParser(description="Локальний сервер Brasa")
    commands = parser.add_subparsers(dest="command", required=True)
    serve = commands.add_parser("serve", help="Запустити сайт")
    serve.add_argument("--host", default="127.0.0.1")
    serve.add_argument("--port", type=int, default=8001)
    commands.add_parser("init-db", help="Створити базу даних")
    manager = commands.add_parser("create-manager", help="Створити менеджера")
    manager.add_argument("--name", required=True)
    manager.add_argument("--email", required=True)
    manager.add_argument("--phone", required=True)
    args = parser.parse_args()
    init_db()
    if args.command == "init-db":
        print(f"Базу даних підготовлено: {DB_PATH}")
    elif args.command == "create-manager":
        create_manager(args)
    else:
        bootstrap_manager()
        server = ThreadingHTTPServer((args.host, args.port), BrasaHandler)
        print(f"Brasa: http://{args.host}:{args.port}/", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
        finally:
            server.server_close()


if __name__ == "__main__":
    main()
