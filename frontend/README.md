# CareerIQ AI Frontend

This folder contains the frontend application including:

- **public/** - Static HTML pages (index, auth, admin, dashboard, onboarding)
- **src/** - Frontend JavaScript and styles

## Structure

```
frontend/
├── public/
│   ├── admin/           # Admin panel
│   ├── auth/            # Authentication pages (login, signup, forgot password)
│   ├── dashboard/       # Resume analysis dashboard
│   ├── onboarding/      # User onboarding flow
│   ├── index.html       # Main landing page
│   ├── auth-hub.html    # Auth navigation hub
│   └── dashboard.html   # Dashboard page
├── src/
│   ├── app.js           # Main frontend JavaScript
│   └── styles.css       # Shared styles
└── package.json
```

## Development

```bash
# Start the development server
npm start

# Or run with live-server directly
npx live-server --port=5500 --open=/public/index.html
```
