# 🐙 How to Push ABC Books to GitHub

## Step 1: Create a Repository
1. Log in to [GitHub.com](https://github.com)
2. Click the **+** icon in the top right -> **New repository**
3. Repository name: `abc-books`
4. Description: "Islamic Bookstore E-commerce Website"
5. Visibility: **Public** or **Private**
6. **Do NOT check** "Initialize this repository with a README"
7. Click **Create repository**

## Step 2: Link Your Local Code
Copy the HTTPS URL of your new repository. It will look like:
`https://github.com/YOUR_USERNAME/abc-books.git`

## Step 3: Run These Commands
Open your terminal in the project folder and run:

```bash
# Add the remote link (replace URL with yours)
git remote add origin https://github.com/YOUR_USERNAME/abc-books.git

# Rename main branch to 'main'
git branch -M main

# Push your code
git push -u origin main
```

## Step 4: Verify
Refresh your GitHub repository page. You should see all your files!

---

## Push to ABC Books repo (live updates)

**Repo:** [https://github.com/ABCpublishing/Abc_Books_publishing_house](https://github.com/ABCpublishing/Abc_Books_publishing_house)

Your local branch is already linked. To update GitHub (and trigger Vercel live deploy):

```bash
cd "c:\Users\Danish\Desktop\ABC Books"
git add -A
git status
git commit -m "Your message"
git push origin main
```

**If you get "Permission denied (403)":**
- You're logged in as **Danish20699**, but the repo is under **ABCpublishing**. Either:
  1. **Add yourself as collaborator:** Log in to GitHub as **ABCpublishing** → repo **Settings** → **Collaborators** → Add people → add **Danish20699** with Write access. Then try `git push origin main` again.
  2. **Push as ABCpublishing:** Sign out of GitHub in browser; in terminal, push again so Git prompts for credentials and use the **ABCpublishing** account (or a [Personal Access Token](https://github.com/settings/tokens) for that account).

After a successful push, if Vercel is connected to this repo, the live site will deploy automatically.
