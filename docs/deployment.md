# Deploying TransitOps

Follow these steps in order. Production topology:

```
your-domain.com ──▶ Vercel (Next.js frontend)  ──HTTPS/JWT──▶ Render (FastAPI backend, Docker) ──SSL──▶ Neon (Postgres)
```

**Order: Neon → Render → copy backend URL → Vercel → connect the two → custom domain.**
The backend auto-creates its tables and seeds demo data on first boot, so the app is populated the
moment it's live.

> **Before you start:** push your latest code to GitHub — Render and Vercel both deploy from the repo.
> ```
> git push origin <your-branch>
> ```

---

## Step 1 — Neon (database) → get your `DATABASE_URL`

1. Go to **[neon.tech](https://neon.tech)** → sign in → **Create project**.
2. Name it `transitops`, pick a region near you → **Create**.
3. Click **Connect** (top-right of the project dashboard).
4. **Copy the whole connection string.** It looks like:
   ```
   postgresql://neondb_owner:npg_AbC123@ep-cool-name-a1b2.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
5. Keep it somewhere handy — you paste it in **Step 2**.

> Paste it **exactly as Neon gives it** — don't edit the scheme or SSL. `backend/app/db.py` normalizes
> `postgresql://` → `postgresql+psycopg://` and ensures SSL automatically.

---

## Step 2 — Render (backend) → **this is WHERE you paste `DATABASE_URL`**

1. Go to **[render.com](https://render.com)** → sign in with GitHub → **New + → Web Service**.
2. Connect GitHub → pick the **`TransitOps`** repo → **Connect**.
3. Fill the form:

   | Field | Value |
   |---|---|
   | **Name** | `transitops-api` |
   | **Language / Runtime** | **Docker** |
   | **Branch** | the branch you pushed (e.g. `main`) |
   | **Dockerfile Path** | `backend/Dockerfile` |
   | **Docker Build Context Directory** | `backend` |
   | **Health Check Path** | `/health` |
   | **Instance Type** | Free |

4. Scroll to **Environment Variables** → **Add** each of these. **The Neon URL from Step 1 goes here,
   as the `DATABASE_URL` value:**

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | ⬅️ **paste your Neon string from Step 1** |
   | `JWT_SECRET` | any long random text (e.g. `change_me_to_something_random_82hf`) |
   | `ALLOWED_ORIGINS` | **leave empty for now** — filled in Step 5 |
   | `APP_URL` | **leave empty for now** — filled in Step 5 |

   *Optional (only for Clerk admin login / credential emails):*

   | Key | Value |
   |---|---|
   | `CLERK_ISSUER` | Clerk Frontend API URL (Step 6) — skip for now |
   | `RESEND_API_KEY` | your Resend key — skip if not using email |
   | `RESEND_FROM` | `TransitOps <noreply@transportitops.orbisynth.biz>` |

5. Click **Create Web Service**. First build takes ~3–5 min; first boot creates tables + seeds demo
   data (~30s more).

6. When it's live, **copy the backend URL** shown at the top of the service page:
   ```
   https://transitops-api.onrender.com
   ```
   **← You paste this into Vercel in Step 4.**

7. Verify: open **`https://transitops-api.onrender.com/health`** → you should see `{"status":"ok"}`.

---

## Step 3 — Clerk production keys (optional)

Skip if you only need the demo (the 4 demo accounts work without Clerk). For the "Admin sign-in
(Clerk)" button on a real domain: in the Clerk dashboard, create a **Production** instance, then copy
its `pk_live_…` and `sk_live_…` (used in Step 4) and note its **Frontend API URL** (used in Step 6).

---

## Step 4 — Vercel (frontend) → **this is WHERE you paste the backend URL**

1. Go to **[vercel.com](https://vercel.com)** → sign in with GitHub → **Add New… → Project**.
2. Import the **`TransitOps`** repo.
3. **Root Directory** → **Edit** → select **`frontend`**. *(critical — this is your frontend dir)*
4. Framework auto-detects **Next.js**; leave build settings default.
5. Expand **Environment Variables** and add:

   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | ⬅️ **paste the Render backend URL from Step 2** (e.g. `https://transitops-api.onrender.com`) |
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_…` (Step 3) — or your `pk_test_…` for now |
   | `CLERK_SECRET_KEY` | `sk_live_…` (Step 3) — or your `sk_test_…` |
   | `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
   | `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
   | `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | `/dashboard` |
   | `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | `/dashboard` |

6. Click **Deploy**. You get a URL like `https://transit-ops.vercel.app`.

---

## Step 5 — Connect the two (the part people forget)

The frontend can't call the backend yet — Render's CORS doesn't know the Vercel URL. Fix it:

1. **Render → transitops-api → Environment.**
2. Fill the two you left empty in Step 2, using your Vercel URL:
   - `ALLOWED_ORIGINS` = `https://transit-ops.vercel.app`
   - `APP_URL` = `https://transit-ops.vercel.app`
3. Save → Render auto-redeploys (~1 min).
4. Open the Vercel URL → log in as **`fleet@transitops.in`** / **`demo1234`** → the dashboard populates. ✅

> The origin must match **exactly** (scheme + host, no trailing slash), or the browser shows a CORS error.

---

## Step 6 — Custom domain (on Vercel)

1. **Vercel → project → Settings → Domains** → add `transitops.yourdomain.com`.
2. At your registrar, add the DNS record Vercel shows (usually a **CNAME** → `cname.vercel-dns.com`
   for a subdomain, or `A`/`ALIAS` for an apex). Wait for the green checkmark + SSL.
3. **Back to Render → Environment:** change `ALLOWED_ORIGINS` **and** `APP_URL` to the final domain
   `https://transitops.yourdomain.com` → save → redeploy.
4. *(If using Clerk prod)* set `CLERK_ISSUER` on Render to the Clerk Frontend API URL, and add the
   domain in the Clerk dashboard.

Judges now visit **`https://transitops.yourdomain.com`**. 🎉

---

## Where / when — the three things people get confused about

- **`DATABASE_URL`** → pasted in **Step 2**, in Render's **Environment Variables** section, while
  creating the Web Service.
- **Backend URL** → appears at the **top of the Render service page after it deploys** (Step 2.6);
  you copy it and paste it as `NEXT_PUBLIC_API_URL` in Vercel (Step 4.5).
- **`ALLOWED_ORIGINS` / `APP_URL`** → left empty at first, filled in **Step 5** once you know the
  Vercel URL, then updated again in **Step 6** to the custom domain.

---

## Verifying the image locally (before Render)

Optional — prove the container works against any Postgres first:

```bash
docker build -t transitops-api backend/
docker run -p 8000:8000 \
  -e DATABASE_URL="<your-neon-url>" \
  -e ALLOWED_ORIGINS="http://localhost:3000" \
  -e JWT_SECRET="dev-secret" \
  transitops-api
curl localhost:8000/health          # {"status":"ok"}
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Frontend loads, API calls fail with a **CORS** error | `ALLOWED_ORIGINS` doesn't match the frontend URL exactly | Set it to the exact origin (scheme + host, no trailing slash) on Render, redeploy. |
| Backend **500 / won't start**, logs show a DB connection error | `DATABASE_URL` wrong, or a self-hosted PG without SSL | Re-copy the Neon string. (For a non-SSL PG, append `?sslmode=disable`.) |
| **Clerk 401** after admin sign-in | `CLERK_ISSUER` on Render ≠ the Clerk instance | Set it to the instance's Frontend API URL, redeploy. |
| Credential emails not sending | `RESEND_API_KEY`/`RESEND_FROM` unset | Optional — the password is still shown in the UI. Set them to enable email. |
| First request after idle is slow | Render free tier sleeps after inactivity | Expected cold start; a paid instance stays warm. |
