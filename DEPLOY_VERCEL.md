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

## Updates

After you push to `main` on GitHub, Vercel will redeploy automatically if the repo is connected.
