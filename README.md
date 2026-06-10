# CareerIQ AI

Fullstack AI-powered career intelligence platform.

## Project Structure

```
careeriqai/
├── backend/          # Express REST API server
├── frontend/         # Frontend application (HTML/JS/CSS)
├── docs/             # Documentation (moved here from root)
├── tools/            # Utility scripts and debug tools
└── package.json      # Root package.json for monorepo scripts
```

## Quick Start

```bash
# Install dependencies
npm install

# Start both backend and frontend concurrently
npm run dev

# Or run separately
npm run backend   # Start Express API on port 5000
npm run frontend  # Start frontend on port 5500
```

## Backend

See [backend/README.md](backend/README.md) for API documentation.

## Frontend

See [frontend/README.md](frontend/README.md) for frontend details.

## Tools

Utility scripts for data extraction, debugging, and migration are in `tools/`.
