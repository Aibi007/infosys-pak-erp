# 🏢 Infosys Pak ERP

**A complete ERP system for Pakistani businesses — FBR compliant, multi-tenant, bilingual (English + اردو)**

---

## 📋 What's Inside

| Folder | What it is |
|--------|-----------|
| `frontend/` | The app screens (React — runs on Cloudflare for free) |
| `backend/` | The server & database (Node.js + PostgreSQL — runs on Railway) |
| `.github/workflows/` | Auto-deployment scripts (runs automatically on GitHub) |

---

## 🚀 HOW TO DEPLOY — Step by Step (No Coding Required)

You need 3 free accounts. Start by creating all three before doing anything else.

### ACCOUNT 1 — GitHub (stores your code)
1. Go to **https://github.com** → Click **Sign up**
2. Choose a username, enter email, create password → Verify email

### ACCOUNT 2 — Railway (runs your backend + database)
1. Go to **https://railway.app** → Click **Login with GitHub**
2. Approve the connection

### ACCOUNT 3 — Cloudflare (serves your frontend — free & fast)
1. Go to **https://cloudflare.com** → Click **Sign Up**
2. Enter email and password → Verify email

---

## STEP 1 — Upload Code to GitHub

1. Log in to **github.com**
2. Click the **"+"** button (top right) → **"New repository"**
3. Name it: `infosys-pak-erp`
4. Make sure **"Public"** is selected (required for free Cloudflare Pages)
5. Click **"Create repository"**
6. On the next page, click **"uploading an existing file"**
7. Unzip the file you downloaded from Claude
8. **Drag the entire `infosys-pak-erp` folder contents** into the upload box
9. Scroll down → Click **"Commit changes"**

✅ Your code is now on GitHub.

---

## STEP 2 — Set Up Backend on Railway

### 2a — Create the backend service

1. Go to **https://railway.app** → Click **"New Project"**
2. Click **"Deploy from GitHub repo"**
3. Select **`infosys-pak-erp`**
4. Railway will show you two folders. Click **"Add service"** → **"GitHub Repo"** again
5. When asked for the root directory, type: `backend`
6. Click **Deploy**

### 2b — Add PostgreSQL database

1. Inside your Railway project, click **"New"** → **"Database"** → **"PostgreSQL"**
2. Railway creates the database automatically and connects it
3. Click on your **backend service** → **"Variables"** tab
4. You will see `DATABASE_URL` was added automatically ✅

### 2c — Add environment variables

Still in the **Variables** tab of your backend service, click **"New Variable"** and add each one:

| Variable Name | Value to enter |
|--------------|----------------|
| `NODE_ENV` | `production` |
| `PORT` | `4000` |
| `JWT_SECRET` | Any long random text, e.g. `MySecretKey_Infosys_2024_Pak_ERP_Secure` |
| `JWT_REFRESH_SECRET` | Different long random text, e.g. `AnotherSecret_Refresh_Infosys_Pakistan` |
| `JWT_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | `30d` |
| `CORS_ORIGIN` | Leave blank for now — you'll update this after Step 3 |
| `LOG_LEVEL` | `info` |

> 💡 **Tip:** For JWT_SECRET, just type a long sentence with no spaces. It just needs to be secret and unique.

### 2d — Run the database setup

1. In Railway, click on your backend service
2. Click **"Settings"** → **"Deploy"**
3. In the **"Start Command"** field, temporarily change it to:
   ```
   node migrate.js && npm start
   ```
4. Click **Save** — Railway will restart and set up all database tables
5. After 1 minute, change the start command back to just `npm start` and save again

### 2e — Get your backend URL

1. Click on your backend service → **"Settings"** tab
2. Under **"Domains"**, click **"Generate Domain"**
3. Copy the URL — it will look like: `https://infosys-erp-backend-production.up.railway.app`
4. **Save this URL** — you'll need it in the next step

✅ Your backend is live.

---

## STEP 3 — Deploy Frontend to Cloudflare Pages

### 3a — Connect GitHub to Cloudflare

1. Log in to **https://dash.cloudflare.com**
2. In the left menu, click **"Workers & Pages"**
3. Click **"Create application"** → **"Pages"** → **"Connect to Git"**
4. Click **"Connect GitHub"** → Approve → Select your `infosys-pak-erp` repo
5. Click **"Begin setup"**

### 3b — Configure the build

Fill in the form exactly like this:

| Setting | Value |
|---------|-------|
| **Project name** | `infosys-pak-erp` |
| **Production branch** | `main` |
| **Framework preset** | `Vite` |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Root directory** | `frontend` |

### 3c — Add environment variable

Still on the same page, scroll down to **"Environment variables"** → Click **"Add variable"**:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | Paste the Railway backend URL from Step 2e, then add `/api/v1` at the end |

Example: `https://infosys-erp-backend-production.up.railway.app/api/v1`

### 3d — Deploy

Click **"Save and Deploy"** → Wait about 2 minutes

When done, Cloudflare shows you a URL like: `https://infosys-pak-erp.pages.dev`

**That's your app — open it in your browser!** 🎉

---

## STEP 4 — Final Connection (Very Important)

Now that your frontend URL is known, go back and update Railway:

1. Go to **railway.app** → Your project → Backend service → **Variables**
2. Update `CORS_ORIGIN` to your Cloudflare URL, e.g.: `https://infosys-pak-erp.pages.dev`
3. Railway restarts automatically

✅ Frontend and backend are now fully connected.

---

## STEP 5 — Set Up Auto-Deploy (so changes deploy automatically)

When you want GitHub to auto-deploy whenever you update code:

### Get Cloudflare API Token
1. Go to **https://dash.cloudflare.com/profile/api-tokens**
2. Click **"Create Token"** → **"Edit Cloudflare Workers"** template
3. Copy the token

### Get Cloudflare Account ID
1. Go to your Cloudflare dashboard home
2. On the right side under **"Account ID"** — copy it

### Get Railway Token
1. Go to **https://railway.app/account/tokens**
2. Click **"Create Token"** → Name it "GitHub Actions" → Copy it

### Add Secrets to GitHub
1. Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **"New repository secret"** for each:

| Secret Name | Value |
|------------|-------|
| `CLOUDFLARE_API_TOKEN` | Paste your Cloudflare token |
| `CLOUDFLARE_ACCOUNT_ID` | Paste your Cloudflare Account ID |
| `RAILWAY_TOKEN` | Paste your Railway token |
| `VITE_API_URL` | Your Railway backend URL + `/api/v1` |

From now on, every time you push code to GitHub → it deploys automatically!

---

## 🔑 First Login

Once everything is deployed, open your Cloudflare Pages URL and log in:

| Field | Value |
|-------|-------|
| **Company Slug** | `demo` |
| **Email** | `admin@infosys.pk` |
| **Password** | `Admin123!` |

> ⚠️ **Change your password immediately after first login!**

---

## 📱 The 11 Modules

| Module | What it does |
|--------|-------------|
| 🏠 Dashboard | Sales summary, charts, quick stats |
| 🛒 POS Terminal | Sales, barcode scanning, receipts |
| 📦 Inventory | Stock management, variants, transfers |
| 💰 Accounting | Double-entry bookkeeping, ledgers |
| 📊 Reports & FBR | FBR tax reports, analytics |
| 🖨 Print Designer | Invoice/receipt templates |
| 🛍 Procurement | Purchase orders, vendors, GRN |
| 📒 Ledger | Customer & vendor accounts |
| 👥 HR & Payroll | Employees, attendance, salaries |
| 🌐 Urdu RTL | Full Urdu interface support |
| ⚙ Super Admin | Multi-tenant management |

---

## 🆘 Common Problems & Solutions

### "Page not found" when refreshing
→ The `_redirects` file in `frontend/` fixes this. Make sure it was uploaded.

### Login says "Network Error"
→ Check that `VITE_API_URL` in Cloudflare matches exactly your Railway URL + `/api/v1`
→ Check that `CORS_ORIGIN` in Railway matches exactly your Cloudflare URL

### Database errors in Railway logs
→ Make sure you ran the migration (Step 2d)
→ Check that `DATABASE_URL` variable exists in Railway

### Build fails on Cloudflare
→ Make sure **Root directory** is set to `frontend` (not blank)
→ Make sure **Build command** is `npm run build`

---

## 📞 Need Help?

Open a conversation with Claude and paste any error message you see — Claude will help you fix it.

---

## 🏗 Project Structure

```
infosys-pak-erp/
│
├── frontend/                    ← React app (Cloudflare Pages)
│   ├── src/
│   │   ├── pages/              ← 10 ERP modules
│   │   │   ├── AppShell.jsx
│   │   │   ├── PosTerminal.jsx
│   │   │   ├── Inventory.jsx
│   │   │   ├── Accounting.jsx
│   │   │   ├── ReportsFbr.jsx
│   │   │   ├── PrintSuperAdmin.jsx
│   │   │   ├── Procurement.jsx
│   │   │   ├── Ledger.jsx
│   │   │   ├── HrPayroll.jsx
│   │   │   └── UrduRtl.jsx
│   │   ├── api/                ← API client + all endpoints
│   │   ├── context/            ← Auth + Notifications
│   │   ├── hooks/              ← Data fetching hooks
│   │   └── components/         ← Login, UserMenu, etc.
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
│
├── backend/                     ← Node.js API (Railway)
│   ├── src/
│   │   ├── routes/             ← 16 API endpoints
│   │   ├── middleware/         ← Auth, rate limiting, etc.
│   │   ├── jobs/               ← FBR sync, session cleanup
│   │   └── utils/              ← JWT, logger, responses
│   ├── db/                     ← 10 SQL migration files
│   ├── migrations/             ← JS migration runners
│   ├── scripts/                ← Deploy, backup, provision
│   ├── package.json
│   └── railway.toml
│
├── .github/
│   └── workflows/
│       ├── deploy-frontend.yml ← Auto-deploy frontend
│       └── deploy-backend.yml  ← Auto-deploy backend
│
└── README.md                   ← This file
```

---

*Built for Pakistani businesses · FBR Compliant · Multi-tenant SaaS · Made with ❤️ in Pakistan 🇵🇰*
