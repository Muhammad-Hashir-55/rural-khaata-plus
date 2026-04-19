# Rural Khata+

**Voice-first multilingual digital ledger for rural businesses**

Rural Khata+ modernizes traditional paper "khata" systems using voice input, OCR, and a lightweight Progressive Web App (PWA). It is designed for low-literacy users in rural and semi-urban areas, enabling effortless tracking of credit, debts, and customer history.

---

## 🚀 Key Features

### 🎙️ Voice-Based Ledger Entry (Primary Interface)

- One-click voice recording using browser-native Web Speech API
- Converts natural speech into structured transactions
  _Example: "Ali bhai ne 500 rupees udhar liye"_
- Supports multilingual input (Urdu, English, Punjabi)

### 👥 Customer Management

- Auto-generated customer profiles
- Tracks balance, transaction history, and pending dues
- Enables future trust scoring

### 📩 Smart Reminders

- One-click reminder generation
- Works via WhatsApp deep links or SMS links
- No external APIs required (Twilio optional)

### 📷 OCR Ledger Digitization

- Scan old paper records
- Extracts data using Gemini Vision (primary) with local OCR fallback

### 📱 PWA (Progressive Web App)

- Installable on mobile, works like a native app
- Lightweight and fast

### 🌐 Offline-First Support

- Logs entries without internet
- Syncs automatically when back online

---

## 🏗️ Tech Stack

| Component           | Technology                  | Purpose                  |
| ------------------- | --------------------------- | ------------------------ |
| Frontend            | Vite + React (TypeScript)   | Fast SPA UI              |
| Styling             | Tailwind CSS + shadcn/ui    | Clean, accessible UI     |
| Backend             | Netlify Functions (Node.js) | Serverless APIs          |
| Database & Auth     | Supabase (PostgreSQL)       | Storage + authentication |
| AI (Voice & Vision) | Web Speech API + Gemini API | Voice + OCR extraction   |
| Deployment          | Netlify                     | Hosting + CI/CD          |

---

## ⚙️ Local Setup

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd rural-khata-plus
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Fill in the following:

```env
VITE_SUPABASE_PROJECT_ID=
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_GEMINI_API_KEY=
VITE_GEMINI_MODEL=gemini-2.5-flash
```

### 3. Install dependencies

```bash
npm install
```

### 4. Run the app

```bash
npm run dev
```

---

## 🗄️ Supabase Setup

1. Create a new project in Supabase
2. Copy credentials into `.env`
3. Link and push the schema:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

> ⚠️ **If linking fails:** Ensure you are logged into the correct Supabase account and have project ownership permissions.

---

## 🧠 How It Works

1. User speaks a transaction
2. Speech is converted to text
3. AI extracts name, amount, and credit/debit direction
4. Entry is saved to the database
5. Customer profile is updated
6. Optional reminder is generated

---

## 💡 Innovation

- **Zero typing UX** — removes the literacy barrier
- **No app store dependency** — works via browser
- **Hybrid AI approach** — voice input with OCR fallback
- **Rural-first design** — built for real-world constraints

---

## 📈 Future Scope

- Trust score (creditworthiness)
- Advanced analytics dashboard
- Multi-shop management
- Full offline sync engine
- SMS gateway integration (Twilio)

---

## 🎯 Hackathon MVP Scope

- Voice-based ledger entry
- Basic customer profiles
- WhatsApp reminder links
- OCR scanning (basic)
- PWA deployment

---

## 📝 Notes

- Voice transcription uses browser-native APIs (no server cost)
- OCR falls back automatically if AI fails
- Works best on modern Chromium browsers
- Designed for low bandwidth and low-end devices
