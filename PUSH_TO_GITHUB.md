# Push this project to GitHub

## 1. Create a new repository on GitHub

- Go to **https://github.com/new**
- Repository name: e.g. `120` or `dense-logic` or `data-model-visualizer`
- Leave it empty (no README, no .gitignore)
- Click **Create repository**

## 2. Add remote and push (from this folder)

Replace `YOUR_USERNAME` and `YOUR_REPO` with your GitHub username and the repo name you chose:

```bash
cd /Users/tomas/120
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

If you use SSH:

```bash
git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## 3. Your repo link

After pushing, your project will be at:

**https://github.com/YOUR_USERNAME/YOUR_REPO**

---

Git is already initialized here with one commit containing the full project (visualizer, L1 schema, sample data, category grouping).
