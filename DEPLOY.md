# Deploy FanSignal to your phone

End state: you open `https://YOUR-GITHUB-USERNAME.github.io/fansignal/` (or save it to your home screen). Fresh data shows up automatically every ~15 minutes — no laptop required.

**Time required:** 15–20 minutes one-time setup. Zero ongoing maintenance.

---

## What you need

- A GitHub account (free) — sign up at https://github.com/signup if you don't have one.
- Git installed on Windows — download at https://git-scm.com/download/win. Run the installer with default options.

That's it. No paid hosting. No domains. No servers.

---

## Step 1 — Create the repo on GitHub

1. Go to https://github.com/new
2. **Repository name:** `fansignal`
3. **Public or Private:** either is fine — even a private repo can host a public Pages site, and there's nothing sensitive in the code.
4. Leave everything else default (no README, no .gitignore — we already have them).
5. Click **Create repository**.

GitHub will show you a page with commands. **Ignore them** — we'll use a slightly different set below.

---

## Step 2 — Push your local FanSignal folder to GitHub

Open a Command Prompt and `cd` to the FanSignal folder:

```bat
cd "C:\Users\17162\OneDrive\Documents\New project\FanSignal"
```

Then run these commands one by one. **Replace `YOUR-USERNAME`** with your actual GitHub username:

```bat
git init
git add .
git commit -m "Initial FanSignal deploy"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/fansignal.git
git push -u origin main
```

The push will prompt for your GitHub credentials. Use a **Personal Access Token** as the password — instructions to create one: https://github.com/settings/tokens (give it `repo` scope, expiration 90 days, save the token somewhere safe).

After the push, refresh your repo page on GitHub — you should see all the files.

---

## Step 3 — Enable GitHub Pages

1. In your repo, click **Settings** (top right).
2. Left sidebar → **Pages**.
3. Under **Source**, pick **Deploy from a branch**.
4. **Branch:** `main`. **Folder:** `/ (root)`. Click **Save**.
5. Wait 30–60 seconds. Refresh the page. You should see a green banner: *"Your site is live at https://YOUR-USERNAME.github.io/fansignal/"*.

Open that URL in your desktop browser to confirm it works.

---

## Step 4 — Enable the auto-refresh workflow

The workflow file is already in your repo (`.github/workflows/refresh.yml`). It needs one permission setting flipped on:

1. Repo → **Settings** → **Actions** → **General**.
2. Scroll to **Workflow permissions**.
3. Select **Read and write permissions**.
4. Click **Save**.

Now trigger the first run:

1. Repo → **Actions** tab.
2. Click **Refresh FanSignal feed** in the left sidebar.
3. Click **Run workflow** → **Run workflow** (the green button).
4. Wait ~30 seconds. A green checkmark means it worked. The workflow now runs every 15 minutes automatically.

---

## Step 5 — Open on your phone

1. On your phone, browse to `https://YOUR-USERNAME.github.io/fansignal/`.
2. **iOS Safari:** tap the **Share** button → **Add to Home Screen**. Name it "FanSignal". Now it's a home-screen icon that opens fullscreen.
3. **Android Chrome:** tap the **⋮ menu** → **Add to Home screen**. Same result.

Open it. You should see Buffalo sports news, the live game strip, all of it — refreshed every 15 minutes by GitHub Actions, with no laptop running.

---

## What to expect

- **First load on phone:** 1–2 seconds.
- **Subsequent loads:** instant (browser caches the static files; only `feed.js` re-downloads).
- **New data:** appears within 60 seconds of the next ingestion run, with a small "*N new stories*" toast.
- **GitHub Actions schedule:** says "every 15 minutes" but free-tier cron jobs often run every 15–30 min in practice. Plenty fresh for sports news.

---

## Maintenance

**You shouldn't need any.** But if you do:

- **Source went dead?** Update `ingest.js` locally, commit, push. The Actions workflow runs on push too, so the feed refreshes immediately.
- **Want to change the refresh interval?** Edit `.github/workflows/refresh.yml`, change `cron: "*/15 * * * *"` to e.g. `"*/10 * * * *"` (every 10 min). Push.
- **Want to add a custom domain** (`fansignal.you.com`)? Repo → Settings → Pages → Custom domain. Then configure your DNS provider with the CNAME GitHub shows you.
- **Want to disable temporarily?** Repo → Actions → Refresh FanSignal feed → menu → Disable workflow.

---

## Cost

$0/month forever, within these limits (you won't hit them):

| Resource | Free limit | FanSignal usage |
|---|---|---|
| GitHub Pages bandwidth | 100 GB/month | ~50 MB/month for one user |
| GitHub Pages storage | 1 GB | ~5 MB |
| GitHub Actions minutes | 2,000/month (public repos: unlimited) | ~60/month at 15-min cron |

If your repo is **public**, Actions minutes are unlimited — no concern at all.
If **private**, you'd use ~60 of 2,000 minutes/month. Still effectively unlimited.

---

## When to upgrade beyond this

You don't need to, for a long time. The real reasons to ever move off this setup:

1. **You want more aggressive refresh** (every 1–5 min). Move ingestion to Cloudflare Workers cron (also free, runs on edge, no minutes cap).
2. **You add private/authenticated sources** (paid API keys). Keep those secrets out of the public repo — move ingestion to a serverless function with environment variables.
3. **You add a database** (saved articles, multi-user). Add a backend, host it on Fly.io / Railway / Cloudflare.

None of those are needed now. Ship this and use it for 14 days.
