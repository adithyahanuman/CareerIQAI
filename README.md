# Career-IQ-AI

CareerIQ AI is a static web application built with HTML, CSS, and vanilla JavaScript, integrated with Firebase for authentication, user profiles, allowed domains management, and audit logging.

## Getting Started

### Local Development
To run a local development server with live reload:
1. Make sure you have [Node.js](https://nodejs.org/) installed.
2. Open your terminal in this project folder and install the local development server:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
   This will host the website locally at `http://localhost:5500`. Any code changes you save will instantly refresh in the browser.

---

## Git Cheatsheet (Pushing Your Changes)

Whenever you edit files locally and want to push the updates to your live website at `https://adithyahanuman.github.io/Career-IQ-AI/`, run the following Git commands in your terminal:

### 1. Stage your changes
Add all modified and new files to the staging area:
```bash
git add .
```

### 2. Commit your changes
Create a local commit describing what you changed:
```bash
git commit -m "Describe your updates here (e.g., fix styling in dashboard)"
```

### 3. Pull latest changes (Always recommended before pushing)
Download and merge any updates that might have been made directly on GitHub (like README edits):
```bash
git pull origin main
```

### 4. Push to GitHub (Publish live)
Upload your local commit to your live GitHub repository:
```bash
git push origin main
```

---

## Folder Structure

* `/auth` — Pages and logic for user authentication (Login, Signup, Password Reset, and Email Verification).
* `/admin` — The administrator portal featuring real-time statistical tiles, domain authorization tables, role management, and audit logs.
* `/onboarding` — The multi-step wizard profile setup page.
* `index.html` — The landing page.
* `dashboard.html` — The main user dashboard.
* `styles.css` — Global styles.
* `app.js` — Main landing page interaction script.