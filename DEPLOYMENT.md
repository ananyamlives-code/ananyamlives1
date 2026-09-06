# 🚀 Complete Production Deployment Guide — Ananyamlives E-Commerce

This guide provides step-by-step instructions for deploying the **Ananyamlives** e-commerce application to production.

---

## 📐 Architecture Overview

| Component | Provider / Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | Netlify | Static HTML/CSS/JS frontend serving `ananyamlives.com` & `www.ananyamlives.com` |
| **Backend API** | Render / Railway | Node.js Express server (`server.js`) |
| **Database** | Neon / Supabase PostgreSQL | Managed cloud PostgreSQL database |
| **Image Storage** | Cloudinary | Persistent cloud image storage for product uploads |
| **Transactional Email** | Gmail SMTP / SendGrid | Mandatory Email OTP verification and order receipts |

---

## Step 1: Create PostgreSQL Database

1. Sign up for a free PostgreSQL database on [Neon](https://neon.tech) or [Supabase](https://supabase.com).
2. Create a new database named `ananyamlives`.
3. Copy your PostgreSQL connection string (`DATABASE_URL`), which looks like:
   ```text
   postgres://username:password@ep-xyz.aws.neon.tech/ananyamlives?sslmode=require
   ```
4. Open the SQL Editor in your database dashboard, paste the contents of `schema.sql`, and execute it to create all required tables (`users`, `categories`, `products`, `orders`, `reviews`, `site_content`, `customer_activity`, `analytics_blocks`).

---

## Step 2: Set Up Cloud Image Storage (Cloudinary)

1. Sign up for a free account on [Cloudinary](https://cloudinary.com).
2. From your Cloudinary Dashboard, copy your **CLOUDINARY_URL** or credentials:
   - `CLOUDINARY_URL` (format: `cloudinary://API_KEY:API_SECRET@CLOUD_NAME`)

---

## Step 3: Deploy Backend API on Render

1. Push your repository to GitHub (ensure `.env` and `node_modules` are NOT committed).
2. Log in to [Render](https://render.com) and click **New + -> Web Service**.
3. Connect your GitHub repository.
4. Configure the Web Service details:
   - **Name**: `ananyamlives-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Under **Environment Variables**, add the following:

   | Key | Value / Example |
   | :--- | :--- |
   | `NODE_ENV` | `production` |
   | `PORT` | `10000` (automatically provided by Render) |
   | `JWT_SECRET` | Generate a random 64-character string |
   | `DATABASE_URL` | Your PostgreSQL connection string from Step 1 |
   | `ALLOWED_ORIGINS` | `https://ananyamlives.com,https://www.ananyamlives.com` |
   | `EMAIL_HOST` | `smtp.gmail.com` |
   | `EMAIL_PORT` | `587` |
   | `EMAIL_USER` | `reach.ananyamlives@gmail.com` |
   | `EMAIL_PASSWORD` | App Password generated from Google Account Security |
   | `EMAIL_FROM` | `"Ananyamlives Care <reach.ananyamlives@gmail.com>"` |
   | `CLOUDINARY_URL` | Your Cloudinary URL from Step 2 |

6. Click **Create Web Service**.
7. Once deployed, note down your live Backend API URL (e.g. `https://ananyamlives-backend.onrender.com`).
8. Verify health status by visiting `https://ananyamlives-backend.onrender.com/api/health`.

---

## Step 4: Configure Frontend API Base URL

1. In your project codebase, open `js/config.js`.
2. Set `customBackendUrl`:
   ```javascript
   var customBackendUrl = 'https://ananyamlives-backend.onrender.com';
   ```
3. Commit and push your changes to GitHub.

---

## Step 5: Deploy Frontend on Netlify

1. Log in to [Netlify](https://netlify.app).
2. Click **Add new site -> Import an existing project**.
3. Select GitHub and pick your project repository.
4. Configure site settings:
   - **Build command**: (leave empty)
   - **Publish directory**: `.`
5. Click **Deploy Site**.

---

## Step 6: Connect Custom Domain (GoDaddy DNS Setup)

1. In Netlify, go to **Site settings -> Domain management -> Add domain**.
2. Enter `ananyamlives.com` and add `www.ananyamlives.com`.
3. Log in to your **GoDaddy Domain Control Center**.
4. Go to **DNS Management** for `ananyamlives.com`.
5. Add/Update the following DNS records:

   | Type | Name / Host | Value / Target | TTL |
   | :--- | :--- | :--- | :--- |
   | **A Record** | `@` | `75.2.60.5` (Netlify Load Balancer IP) | ½ Hour |
   | **CNAME** | `www` | `your-netlify-app-name.netlify.app.` | ½ Hour |

6. Return to Netlify under **HTTPS / SSL Certificates** and click **Verify DNS configuration** & **Provision certificate**.

---

## Step 7: Final Verification Checklist

- [ ] Visit `https://ananyamlives.com` in browser.
- [ ] Check page load and product catalog rendering.
- [ ] Test User Account Registration & Email OTP verification.
- [ ] Test Login flow.
- [ ] Test placing an order (Direct / WhatsApp workflow).
- [ ] Visit `https://ananyamlives.com/admin.html` and log in with admin account.
- [ ] Add/Edit a product with an uploaded image (confirm Cloudinary URL works).
- [ ] Verify PDF invoice generation in Admin Panel.
- [ ] Confirm no Razorpay or online payment errors appear in browser console.
