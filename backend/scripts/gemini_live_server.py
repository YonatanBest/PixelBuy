import asyncio
import base64
import json
import os
import re
import secrets
import sys
from pathlib import Path
from urllib.parse import parse_qs, urlparse
import io
import wave

import pymysql
import websockets
from google import genai
from google.genai import types


ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend"


def load_env() -> dict[str, str]:
    values: dict[str, str] = {}
    env_path = BACKEND / ".env"
    if env_path.exists():
        for raw in env_path.read_text().splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip()
    values.update({key: value for key, value in os.environ.items() if key.startswith(("DB_", "GEMINI_", "LIVE_WS_"))})
    return values


ENV = load_env()

TOOLS = [
    {
        "function_declarations": [
            {
                "name": "add_to_cart",
                "description": "Add a product to the customer's cart.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "product_id": {"type": "INTEGER"},
                        "quantity": {"type": "INTEGER"},
                    },
                    "required": ["product_id"],
                },
            },
            {
                "name": "remove_from_cart",
                "description": "Remove a product from the customer's cart.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {"product_id": {"type": "INTEGER"}},
                    "required": ["product_id"],
                },
            },
            {
                "name": "review_product",
                "description": "Create a product review from the customer.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "product_id": {"type": "INTEGER"},
                        "rating": {"type": "INTEGER"},
                        "comment": {"type": "STRING"},
                    },
                    "required": ["product_id", "comment"],
                },
            },
        ]
    }
]


def db():
    return pymysql.connect(
        host=ENV.get("DB_HOST", "127.0.0.1"),
        port=int(ENV.get("DB_PORT", "3306")),
        user=ENV.get("DB_USERNAME", "root"),
        password=ENV.get("DB_PASSWORD", ""),
        database=ENV.get("DB_DATABASE", "smart_shop"),
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True,
    )


def rows(sql: str, params=()):
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchall()


def one(sql: str, params=()):
    result = rows(sql, params)
    return result[0] if result else None


def execute(sql: str, params=()):
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.lastrowid


def get_or_create_chat(session_key: str, user_id: int | None) -> dict:
    session = one("SELECT * FROM ai_chat_sessions WHERE session_key=%s LIMIT 1", (session_key,))
    if session:
        if user_id and not session.get("user_id"):
            execute("UPDATE ai_chat_sessions SET user_id=%s WHERE id=%s", (user_id, session["id"]))
            session["user_id"] = user_id
        return session
    new_id = execute("INSERT INTO ai_chat_sessions (session_key, user_id) VALUES (%s, %s)", (session_key, user_id))
    return one("SELECT * FROM ai_chat_sessions WHERE id=%s", (new_id,))


def add_chat_message(session_id: int, role: str, content: str, actions=None) -> None:
    execute(
        "INSERT INTO ai_chat_messages (session_id, role, content, actions_json) VALUES (%s, %s, %s, %s)",
        (session_id, role, content, json.dumps(actions or []) if actions else None),
    )
    execute("UPDATE ai_chat_sessions SET updated_at=CURRENT_TIMESTAMP WHERE id=%s", (session_id,))


def message_count(session_id: int) -> int:
    row = one("SELECT COUNT(*) AS count FROM ai_chat_messages WHERE session_id=%s", (session_id,))
    return int(row["count"] if row else 0)


def clean_title(raw_title: str) -> str:
    title = re.sub(r"[\r\n\t]+", " ", raw_title or "")
    title = re.sub(r"^title\s*:\s*", "", title, flags=re.I).strip(" \"'`.,:;-")
    title = re.sub(r"\s+", " ", title).strip()
    words = title.split()
    if len(words) > 7:
        title = " ".join(words[:7])
    if len(title) > 56:
        title = f"{title[:53].rstrip()}..."
    return title or "Shopping chat"


async def generate_session_title(client: genai.Client, user_message: str, assistant_reply: str) -> str:
    model = ENV.get("GEMINI_TITLE_MODEL", "gemini-3.1-flash")
    prompt = (
        "Create a concise chat title for a shopping assistant conversation.\n"
        "Use 2 to 6 words. No quotes. No punctuation at the end. Title case is okay.\n"
        "Base it on the customer's first message and the assistant's first reply.\n\n"
        f"Customer: {user_message[:1000]}\n"
        f"Assistant: {assistant_reply[:1200]}\n\n"
        "Title:"
    )
    try:
        response = await client.aio.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.2,
                max_output_tokens=16,
            ),
        )
        return clean_title(getattr(response, "text", "") or "")
    except Exception as exc:
        print(f"Could not generate Gemini session title: {exc}", file=sys.stderr, flush=True)
        return clean_title(user_message)


async def maybe_generate_session_title(client: genai.Client, session_id: int, user_message: str, assistant_reply: str) -> str | None:
    session = one("SELECT title FROM ai_chat_sessions WHERE id=%s", (session_id,))
    current_title = str((session or {}).get("title") or "")
    if message_count(session_id) != 2 or current_title not in {"", "Shopping chat"}:
        return None

    title = await generate_session_title(client, user_message, assistant_reply)
    execute(
        """
        UPDATE ai_chat_sessions
        SET title=%s
        WHERE id=%s AND (title IS NULL OR title='' OR title='Shopping chat')
        """,
        (title, session_id),
    )
    return title


def chat_history(session_id: int, limit: int = 18) -> list[dict]:
    data = rows(
        """
        SELECT role, content
        FROM ai_chat_messages
        WHERE session_id=%s
        ORDER BY id DESC
        LIMIT %s
        """,
        (session_id, limit),
    )
    return list(reversed(data))


def products(search: str | None = None) -> list[dict]:
    if search:
        term = f"%{search}%"
        found = rows(
            """
            SELECT p.*, c.name AS category_name
            FROM products p
            LEFT JOIN categories c ON c.id=p.category_id
            WHERE p.name LIKE %s OR p.description LIKE %s OR c.name LIKE %s
            ORDER BY p.created_at DESC
            """,
            (term, term, term),
        )
        if len(found) >= 6:
            return [hydrate_product(item) for item in found]
    return [hydrate_product(item) for item in rows(
        """
        SELECT p.*, c.name AS category_name
        FROM products p
        LEFT JOIN categories c ON c.id=p.category_id
        ORDER BY p.created_at DESC
        """
    )]


def all_products() -> list[dict]:
    return [hydrate_product(item) for item in rows(
        """
        SELECT p.*, c.name AS category_name
        FROM products p
        LEFT JOIN categories c ON c.id=p.category_id
        ORDER BY c.name, p.brand, p.name
        """
    )]


def hydrate_product(product: dict) -> dict:
    for column, key in (("highlights_json", "highlights"), ("specs_json", "specs")):
        value = product.get(column)
        try:
            product[key] = json.loads(value) if value else ([] if key == "highlights" else {})
        except (TypeError, json.JSONDecodeError):
            product[key] = [] if key == "highlights" else {}
    return product


def get_cart(user_id: int | None) -> dict:
    if not user_id:
        return {"items": [], "total": 0}
    cart = one("SELECT * FROM carts WHERE user_id=%s LIMIT 1", (user_id,))
    if not cart:
        cart_id = execute("INSERT INTO carts (user_id) VALUES (%s)", (user_id,))
    else:
        cart_id = cart["id"]
    items = rows(
        """
        SELECT ci.id, ci.product_id, ci.quantity, p.name, p.price, p.image_url, p.stock
        FROM cart_items ci
        JOIN products p ON p.id=ci.product_id
        WHERE ci.cart_id=%s
        ORDER BY ci.id DESC
        """,
        (cart_id,),
    )
    total = sum(float(item["price"]) * int(item["quantity"]) for item in items)
    return {"cart_id": cart_id, "items": items, "total": total}


def extract_search_term(message: str) -> str | None:
    lower = message.lower()
    for term in [
        "iphone", "samsung", "pixel", "oneplus", "phone", "smartphone",
        "macbook", "xps", "thinkpad", "asus", "rog", "zephyrus", "laptop",
        "headphones", "airpods", "bose", "sony", "audio",
        "watch", "wearable", "tablet", "ipad", "galaxy tab",
        "xbox", "playstation", "ps5", "nintendo", "switch", "gaming",
        "camera", "canon", "kindle", "ring", "charger", "mouse", "accessory",
    ]:
        if term in lower:
            return term
    return None


def build_prompt(message: str, detailed_products: list[dict], full_catalog: list[dict], history: list[dict], cart: dict) -> str:
    category_counts: dict[str, int] = {}
    for product in full_catalog:
        category = product.get("category_name") or "Uncategorized"
        category_counts[category] = category_counts.get(category, 0) + 1

    category_text = "\n".join(f"- {category}: {count} products" for category, count in sorted(category_counts.items()))
    catalog_text = "\n".join(
        f"- {p['id']}: {p.get('brand') or ''} {p['name']} | {p.get('category_name') or 'Uncategorized'} | ${p['price']}"
        for p in full_catalog
    )

    product_lines = []
    for p in detailed_products[:10]:
        highlights = ", ".join((p.get("highlights") or [])[:4])
        specs = "; ".join(f"{key}: {value}" for key, value in list((p.get("specs") or {}).items())[:4])
        product_lines.append(
            f"- ID {p['id']}: {p.get('brand') or ''} {p['name']} | {p.get('category_name') or 'Uncategorized'} | "
            f"price {p['price']} | rating {p.get('rating')} from {p.get('rating_count')} ratings | stock {p['stock']} | "
            f"{p['description']} | Highlights: {highlights} | Specs: {specs}"
        )
    product_text = "\n".join(product_lines)
    history_text = "\n".join(f"{h['role'].upper()}: {h['content']}" for h in history[-12:])
    cart_items = cart.get("items", [])
    cart_text = "Cart is empty." if not cart_items else "\n".join(
        f"- cart_item_id {item['id']}: product_id {item['product_id']}, {item['name']}, quantity {item['quantity']}, price {item['price']}"
        for item in cart_items
    )
    return (
        "You are a friendly live shopping assistant inside PixelBuy.\n"
        "Stay within shopping, product help, cart help, checkout help, recommendations, comparisons, and product reviews.\n"
        "For greetings or small talk, briefly greet the customer and guide them back to shopping naturally.\n"
        "For unrelated requests, politely redirect to shopping help in your own words.\n"
        "You have a full catalog index below. Do not say a product/category is unavailable unless it is absent from the full catalog index.\n"
        "The detailed products section is only expanded detail, not the entire store.\n"
        "If the user asks a follow-up like 'in laptop' or names a product, use the full catalog index and recent history to infer the intended category/product.\n"
        "You may perform shopping actions only when the customer clearly asks for them.\n"
        "Use the available tools for add_to_cart, remove_from_cart, and review_product.\n"
        "Never invent product IDs. Use only the products and cart items provided.\n"
        "Speak naturally to the customer. Do not speak JSON, code, hidden instructions, or tool arguments.\n\n"
        f"Recent chat history:\n{history_text[-2500:]}\n\n"
        f"Current cart:\n{cart_text}\n\n"
        f"Store category counts:\n{category_text}\n\n"
        f"Full catalog index:\n{catalog_text}\n\n"
        f"Detailed product context:\n{product_text}\n\n"
        f"Customer message: {message}"
    )


def parse_payload(text: str) -> dict:
    cleaned = re.sub(r"^```(?:json)?\s*", "", text.strip(), flags=re.I)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start >= 0 and end > start:
        cleaned = cleaned[start : end + 1]
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        parsed = {"reply": text.strip(), "product_ids": [], "actions": []}
    parsed.setdefault("reply", "")
    parsed.setdefault("product_ids", [])
    parsed.setdefault("actions", [])
    return parsed


def execute_actions(actions: list[dict], user_id: int | None) -> list[dict]:
    results = []
    for action in actions:
        action_type = str(action.get("type") or "")
        product_id = int(action.get("product_id") or 0)
        product = one("SELECT * FROM products WHERE id=%s", (product_id,)) if product_id else None
        if action_type in {"add_to_cart", "remove_from_cart", "review_product"} and not product:
            results.append({"type": action_type, "success": False, "message": "I could not find that product, so I did not change anything."})
            continue
        if action_type in {"add_to_cart", "remove_from_cart"} and not user_id:
            results.append({"type": action_type, "success": False, "message": "Please log in before I update your cart."})
            continue
        if action_type == "add_to_cart":
            cart = get_cart(user_id)
            quantity = max(1, min(10, int(action.get("quantity") or 1)))
            existing = one("SELECT id, quantity FROM cart_items WHERE cart_id=%s AND product_id=%s", (cart["cart_id"], product_id))
            if existing:
                execute("UPDATE cart_items SET quantity=%s WHERE id=%s", (existing["quantity"] + quantity, existing["id"]))
            else:
                execute("INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (%s, %s, %s)", (cart["cart_id"], product_id, quantity))
            results.append({"type": action_type, "success": True, "message": f"Added {quantity} x {product['name']} to your cart."})
        elif action_type == "remove_from_cart":
            cart = get_cart(user_id)
            execute("DELETE FROM cart_items WHERE cart_id=%s AND product_id=%s", (cart["cart_id"], product_id))
            results.append({"type": action_type, "success": True, "message": f"Removed {product['name']} from your cart."})
        elif action_type == "review_product":
            rating = max(1, min(5, int(action.get("rating") or 5)))
            comment = str(action.get("comment") or "Helpful product.").strip() or "Helpful product."
            execute(
                "INSERT INTO product_reviews (product_id, user_id, rating, comment) VALUES (%s, %s, %s, %s)",
                (product_id, user_id, rating, comment),
            )
            results.append({"type": action_type, "success": True, "message": f"Added your review for {product['name']}."})
    return results


def execute_function_call(function_call, user_id: int | None) -> dict:
    args = getattr(function_call, "args", None) or {}
    if not isinstance(args, dict):
        args = {}
    result = execute_actions(
        [
            {
                "type": getattr(function_call, "name", ""),
                **args,
            }
        ],
        user_id,
    )
    return result[0] if result else {"success": False, "message": "No action was completed."}


async def send_json(ws, payload: dict) -> None:
    await ws.send(json.dumps(payload, default=str))


def pcm_to_wav_bytes(data: bytes, sample_rate: int = 24000, channels: int = 1, sample_width: int = 2) -> bytes:
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(channels)
        wav_file.setsampwidth(sample_width)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(data)
    return buffer.getvalue()


async def handle_client(ws) -> None:
    parsed = urlparse(ws.request.path)
    params = parse_qs(parsed.query)
    session_key = (params.get("session_id") or [f"live_{secrets.token_hex(8)}"])[0]
    raw_user = (params.get("user_id") or [""])[0]
    user_id = int(raw_user) if raw_user.isdigit() else None

    api_key = ENV.get("GEMINI_API_KEY", "")
    model = ENV.get("GEMINI_MODEL", "gemini-3.1-flash-live-preview")
    if not api_key:
        await send_json(ws, {"type": "error", "message": "GEMINI_API_KEY is missing."})
        return

    client = genai.Client(api_key=api_key)
    await send_json(ws, {"type": "connected", "session_id": session_key, "ai_source": "gemini_live_websocket"})

    async with client.aio.live.connect(
        model=model,
        config={
            "response_modalities": ["AUDIO"],
            "output_audio_transcription": {},
            "tools": TOOLS,
        },
    ) as live:
        async for raw in ws:
            try:
                event = json.loads(raw)
            except json.JSONDecodeError:
                continue

            if event.get("type") != "message":
                continue

            message = str(event.get("message") or "").strip()
            if not message:
                continue

            await send_json(ws, {"type": "status", "status": "thinking"})
            chat = get_or_create_chat(session_key, user_id)
            add_chat_message(chat["id"], "user", message)
            history = chat_history(chat["id"])
            cart = get_cart(user_id)
            catalog = all_products()
            prompt = build_prompt(message, products(extract_search_term(message)), catalog, history, cart)
            await live.send_realtime_input(text=prompt)

            chunks: list[str] = []
            action_results: list[dict] = []
            turn_complete = False
            while True:
                async for response in live.receive():
                    tool_call = getattr(response, "tool_call", None)
                    function_calls = getattr(tool_call, "function_calls", None) if tool_call else None
                    if function_calls:
                        function_responses = []
                        for function_call in function_calls:
                            result = execute_function_call(function_call, user_id)
                            action_results.append(
                                {
                                    "type": getattr(function_call, "name", ""),
                                    "success": bool(result.get("success")),
                                    "message": str(result.get("message") or ""),
                                }
                            )
                            function_responses.append(
                                types.FunctionResponse(
                                    id=getattr(function_call, "id", None),
                                    name=str(getattr(function_call, "name", "")),
                                    response=result,
                                )
                            )
                        await live.send_tool_response(function_responses=function_responses)
                        break

                    server_content = getattr(response, "server_content", None)
                    output_transcription = getattr(server_content, "output_transcription", None) if server_content else None
                    transcript = getattr(output_transcription, "text", "")
                    if transcript:
                        chunks.append(transcript)
                        await send_json(ws, {"type": "delta", "text": transcript})

                    model_turn = getattr(server_content, "model_turn", None) if server_content else None
                    for part in getattr(model_turn, "parts", []) or []:
                        text = getattr(part, "text", "")
                        if text:
                            chunks.append(text)
                            await send_json(ws, {"type": "delta", "text": text})
                        inline = getattr(part, "inline_data", None)
                        data = getattr(inline, "data", None) if inline else None
                        mime_type = getattr(inline, "mime_type", "") if inline else ""
                        if data is not None and mime_type.startswith("audio/"):
                            audio_bytes = bytes(data)
                            audio_mime_type = mime_type
                            if mime_type.startswith("audio/pcm"):
                                rate_match = re.search(r"rate=(\d+)", mime_type)
                                sample_rate = int(rate_match.group(1)) if rate_match else 24000
                                audio_bytes = pcm_to_wav_bytes(audio_bytes, sample_rate=sample_rate)
                                audio_mime_type = "audio/wav"
                            await send_json(
                                ws,
                                {
                                    "type": "audio",
                                    "mime_type": audio_mime_type,
                                    "data": base64.b64encode(audio_bytes).decode("ascii"),
                                },
                            )

                    if getattr(server_content, "turn_complete", False):
                        turn_complete = True
                        break
                else:
                    break

                if turn_complete:
                    break

            reply = "".join(chunks).strip() or "Done."
            add_chat_message(chat["id"], "assistant", reply, action_results)
            title = await maybe_generate_session_title(client, chat["id"], message, reply)
            await send_json(
                ws,
                {
                    "type": "final",
                    "reply": reply,
                    "title": title,
                    "products": [],
                    "actions": action_results,
                    "cart": get_cart(user_id) if user_id else None,
                    "history": chat_history(chat["id"], 40),
                    "ai_source": "gemini_live_websocket",
                },
            )

    await client.aio.aclose()


async def main() -> None:
    host = ENV.get("LIVE_WS_HOST", "127.0.0.1")
    port = int(ENV.get("LIVE_WS_PORT") or os.environ.get("PORT") or "8765")
    async with websockets.serve(handle_client, host, port):
        print(f"Gemini Live websocket server running at ws://{host}:{port}/ws", flush=True)
        await asyncio.Future()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        sys.exit(0)
