# AI-Powered E-Commerce Smart Shopping System

This repository contains a complete project shopping platform:

- PHP OOP backend with REST-like `.php` endpoints.
- MySQL schema and seed data.
- React.js web storefront.
- Expo React Native mobile app.
- Gemini-powered shopping assistant with a persistent Python websocket server using Gemini Live.
- Real electronics/device catalog with product source/spec links, ratings, highlights, and technical details.
- Dummy checkout that stores delivery, payment method, card last 4 digits, and order notes.

## Quick Install And Run

These steps assume Windows + XAMPP.

### Requirements

Install:

- XAMPP with Apache and MySQL.
- PHP available from XAMPP, usually `C:\xampp\php\php.exe`.
- Node.js and npm.
- Python 3.12 or another recent Python version.

### 1. Open The Project Folder

```powershell
cd "AI-Powered Real-Time Shopping Platform"
```

### 2. Start XAMPP

Open XAMPP Control Panel and start:

```text
Apache
MySQL
```

### 3. Create The Backend Environment File

```powershell
copy backend\env.example backend\.env
```

Edit `backend/.env` and make sure these values match your local setup:

```text
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=smart_shop
DB_USERNAME=root
DB_PASSWORD=
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-3.1-flash-live-preview
GEMINI_PLANNER_MODEL=gemini-3.1-flash-lite-preview
PYTHON_BIN=../.venv/Scripts/python.exe
```

### 4. Import The MySQL Database

From the project root:

```powershell
C:\xampp\mysql\bin\mysql.exe -u root --execute="source AI-Powered Real-Time Shopping Platform/database/schema.sql;"
C:\xampp\mysql\bin\mysql.exe -u root --execute="source AI-Powered Real-Time Shopping Platform/database/seed.sql;"
```

### 5. Install Python AI Dependencies

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
```

### 6. Install Web Dependencies

```powershell
cd web
npm install
cd ..
```

### 7. Install Mobile Dependencies

```powershell
cd mobile
npm install
npx expo install react-dom react-native-web
cd ..
```

### 8. Run The PHP Backend

Open a terminal from the project root:

```powershell
C:\xampp\php\php.exe -S 0.0.0.0:8000 -t backend/public
```

Backend URL:

```text
http://<your-computer-ip>:8000
```

If you are opening the app from a phone browser, use your computer's LAN IP for the frontend URL and make sure the PHP server is bound to `0.0.0.0` so the phone can reach it.

### 9. Run The Gemini Live Websocket Server

Open a second terminal from the project root:

```powershell
.\.venv\Scripts\python.exe backend\scripts\gemini_live_server.py
```

Live AI websocket URL:

```text
ws://127.0.0.1:8765/ws
```

The React web assistant requires this websocket for AI chat. The old request-response AI endpoint has been removed.
Gemini Live audio is streamed from this server to the browser as PCM audio, so the assistant voice comes from Gemini Live rather than browser text-to-speech.

### 10. Run The React Web App

Open a third terminal:

```powershell
cd "AI-Powered Real-Time Shopping Platform\web"
npm run dev
```

Open:

```text
http://127.0.0.1:5173
```

### 11. Run The Mobile App

Open another terminal:

```powershell
cd "AI-Powered Real-Time Shopping Platform\mobile"
npm start
```

For browser preview of the mobile app:

```powershell
npm run web
```

### Demo Login

```text
Student:
student@smartshop.test
password123

Admin:
admin@smartshop.test
password123
```

## Project Structure

```text
backend/
  public/                 Required API endpoints
  app/Core/               Request, response, auth, database helpers
  app/Models/             User, Product, Cart, Order, and related classes
  app/Controllers/        Auth, products, cart, orders, AI controllers
  app/Services/           AiAssistantService
  scripts/                Persistent Gemini Live websocket server
database/
  schema.sql              MySQL tables with rich product and checkout fields
  seed.sql                Real electronics categories, products, demo users
web/
  src/                    React.js storefront
mobile/
  src/                    Expo React Native app
```

## 1. Database Setup

Create and seed the MySQL database:

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

Demo accounts:

```text
Admin:   admin@smartshop.test / password123
Student: student@smartshop.test / password123
```

## 2. Backend Setup

Copy the environment file:

```bash
copy backend\.env.example backend\.env
```

Update database credentials in `backend/.env`.

Start the PHP backend:

```bash
php -S localhost:8000 -t backend/public
```

Required endpoints:

```text
POST   /register.php
POST   /login.php
POST   /logout.php
GET    /products.php
POST   /products.php
PUT    /products.php?id=1
DELETE /products.php?id=1
GET    /cart.php
POST   /cart.php
PUT    /cart.php
DELETE /cart.php
GET    /orders.php
POST   /orders.php
GET    /ai.php?session_id=...  Chat history only
```

`POST /orders.php` accepts dummy checkout information:

```json
{
  "customer_name": "Student User",
  "email": "student@smartshop.test",
  "phone": "+1 555 0100",
  "address": "123 Demo Street",
  "city": "Seattle",
  "state": "WA",
  "zip": "98101",
  "payment_method": "Demo Visa",
  "card_number": "4242 4242 4242 4242",
  "delivery_method": "Standard delivery",
  "notes": "Leave at front desk"
}
```

## 3. Gemini AI Setup

The backend uses:

```text
GEMINI_MODEL=gemini-3.1-flash-live-preview
```

For real Gemini Live API responses:

```bash
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
```

Then set:

```text
GEMINI_API_KEY=your_api_key
PYTHON_BIN=../.venv/Scripts/python.exe
```

The AI chat itself runs through `backend/scripts/gemini_live_server.py`. `/ai.php` is only used to load stored chat history.

The assistant now supports:

- Persistent chat sessions stored in MySQL.
- Conversation history sent back to Gemini on each turn.
- A true long-lived Gemini Live websocket server for the React web assistant.
- Microphone listening on by default in the React web widget, with a mute button.
- Gemini Live voice output in the React web widget, with a voice mute button.
- Mobile AI screen microphone listening on by default using `expo-speech-recognition`, with a mute button.
- AI-decided shopping behavior instead of hardcoded keyword blocking.
- Validated actions for adding to cart, removing from cart, and creating product reviews.

Note: browsers and mobile operating systems may still ask the user for microphone permission. On mobile, native speech recognition works in a development/native build; Expo Go support depends on the installed native modules available in the client.

## Catalog Notes

The seeded catalog contains real electronics and device names across smartphones, laptops, audio, tablets, wearables, gaming, cameras, smart home, and accessories. Each product includes:

- Brand and model.
- Demo price and optional original price.
- Rating and rating count.
- Highlights and technical specifications.
- Warranty and shipping note.
- Source/spec URL for presentation reference.

Prices are demo/storefront values for the project and should not be treated as live retailer prices.

## 4. React Web App

```bash
cd web
npm install
npm run dev
```

The app expects the backend at:

```text
http://localhost:8000
```

Override if needed:

```text
VITE_API_BASE=http://localhost:8000
```

## 5. React Native Mobile App

```bash
cd mobile
npm install
npm start
```

For Android emulator, the default backend URL is:

```text
http://10.0.2.2:8000
```

For a real phone, set:

```text
EXPO_PUBLIC_API_BASE=http://YOUR_COMPUTER_IP:8000
```

## Course Mapping

- Advanced Internet Programming: PHP OOP backend, CRUD, authentication, MySQL.
- E-Commerce Course: React product listing, cart, checkout, admin product form.
- Mobile Computing: Expo React Native product browsing, cart, login, AI assistant.
- AI Differentiator: shopping-domain Gemini assistant for recommendations, explanations, and comparisons.
