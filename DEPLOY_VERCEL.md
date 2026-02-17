# Deploy to Vercel

## Steps

1. **Go to [vercel.com](https://vercel.com)** and sign in with **GitHub**.

2. **New Project**
   - Click **"Add New..."** → **"Project"**.
   - Under **Import Git Repository**, find **tomasgutierrez2000-eng/dmv1** (or connect your GitHub account if needed).
   - Click **Import** next to **dmv1**.

3. **Configure (optional)**
   - **Framework Preset:** Next.js (auto-detected).
   - **Root Directory:** leave as `.` (project root).
   - **Build Command:** `npm run build` (default).
   - **Output Directory:** leave default.
   - Click **Deploy**.

4. **Wait for the build** (1–2 minutes). When it finishes you get a URL like:
   - **https://dmv1-xxxxx.vercel.app**

5. **Share the link** so others can open the data model visualizer. Use **"Load L1 demo"** to view the 78 L1 tables and sample data.

---

## Add or create a new domain

If you removed a domain or want a new one:

### Option A: Use the default Vercel URL (no custom domain)

- Every deployment gets a **default URL**: `https://<project-name>-<team>-<hash>.vercel.app`.
- Open your project on [vercel.com/dashboard](https://vercel.com/dashboard) → select **dmv1** (or your project).
- Go to the **Deployments** tab and open the latest deployment. The **Visit** link is your live URL.
- Or go to **Settings** → **Domains**: the default `.vercel.app` domain is listed there. If you removed it, trigger a new deploy (push to `main` or **Redeploy** from the Deployments tab); the default domain is re-assigned.

### Option B: Add a custom domain

1. Open [vercel.com/dashboard](https://vercel.com/dashboard) → select your project (**dmv1**).
2. Go to **Settings** → **Domains**.
3. Under **Domain**, type your domain (e.g. `app.yourcompany.com` or `dmv1.yourcompany.com`) and click **Add**.
4. Follow the instructions:
   - **For a subdomain** (e.g. `app.yourcompany.com`): Add the CNAME record Vercel shows (e.g. `cname.vercel-dns.com`) at your DNS provider.
   - **For apex/root** (e.g. `yourcompany.com`): Add the A records Vercel shows (e.g. `76.76.21.21`) at your DNS provider.
5. Wait for DNS to propagate (minutes to 48 hours). Vercel will show **Valid Configuration** when it’s ready.

### Option C: Add another Vercel subdomain (e.g. a new `*.vercel.app`)

- You can’t create a second default `*.vercel.app` for the same project; each project has one.
- To get a “new” default URL: create a **new project** that imports the same GitHub repo (e.g. **dmv1**) — that project will get its own `https://dmv1-xxx.vercel.app` URL. (Or use a custom domain as in Option B.)

---

## Updates

After you push to `main` on GitHub, Vercel will redeploy automatically if the repo is connected.
