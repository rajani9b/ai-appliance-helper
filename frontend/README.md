# AI Appliance Helper

AI Appliance Helper is a React and Node.js application that analyzes photos of
home appliances, controls, labels, error messages, and vehicle dashboards. It
uses the OpenAI Responses API with vision capabilities to provide practical,
safety-aware guidance and supports follow-up questions through a chat interface.

## Features

- Upload or capture JPEG, PNG, and WebP images.
- Identify visible appliances, devices, controls, labels, and dashboard symbols.
- Explain settings, maintenance, troubleshooting steps, and safety concerns.
- Continue the analysis through contextual follow-up questions.
- Provide vehicle-dashboard escalation guidance for potentially critical warnings.
- Validate image type, signature, and size on both the frontend and backend.
- Handle request timeouts, cancellation, malformed responses, and API errors.
- Support keyboard navigation, reduced motion, screen-reader status messages, and responsive layouts.
- Protect AI endpoints with CORS restrictions, request limits, and rate limiting.

## Built With

- React
- TypeScript
- Vite
- HTML5 and CSS3
- Node.js
- Express.js
- OpenAI Responses API
- OpenAI Node SDK
- React Markdown
- Remark GFM
- CORS
- dotenv
- Express Rate Limit

The current MVP does not require a database and does not intentionally persist
uploaded images or conversations.

## Project Files

This reviewed bundle contains:

```text
App.tsx
App.css
server.js
README.md
```

Place `App.tsx` and `App.css` in the frontend `src` directory. Place
`server.js` in the backend directory.

## Prerequisites

- Node.js 20 or later
- npm
- An OpenAI API key with access to the configured models

## Backend Installation

Install the required packages in the backend project:

```bash
npm install express cors dotenv express-rate-limit openai
```

Ensure the backend `package.json` supports ES modules and contains a start
script:

```json
{
  "type": "module",
  "scripts": {
    "start": "node server.js"
  }
}
```

## Frontend Installation

Install the frontend dependencies in the Vite project:

```bash
npm install react react-dom react-markdown remark-gfm
```

Use the existing Vite development and build scripts:

```bash
npm run dev
npm run build
```

## Environment Variables

Create a private `.env` file for the backend:

```env
OPENAI_API_KEY=your_server_side_key
OPENAI_ANALYSIS_MODEL=gpt-5.6
OPENAI_CHAT_MODEL=gpt-5.6
ALLOWED_ORIGINS=http://localhost:5173
```

Optional backend variables:

```env
PORT=3001
TRUST_PROXY_HOPS=1
```

Set `TRUST_PROXY_HOPS=1` only when the Express server is behind one trusted
reverse proxy. Adjust it to match the actual hosting topology. Leave it unset
for normal direct local development.

The frontend can use:

```env
VITE_API_BASE_URL=http://localhost:3001
```

When deployed, replace the local URL with the public backend HTTPS URL.

## Local Development

Start the backend:

```bash
npm start
```

The default backend address is:

```text
http://localhost:3001
```

Start the Vite frontend in its own terminal:

```bash
npm run dev
```

The default frontend address is usually:

```text
http://localhost:5173
```

Check backend configuration at:

```text
http://localhost:3001/api/health
```

The health endpoint reports local configuration, not guaranteed availability
of the external AI provider.

## Image Requirements

- Supported formats: JPEG, PNG, and WebP
- Maximum decoded size: 8 MB
- Use clear lighting and keep labels, controls, or warning symbols visible.
- Do not upload private documents or images containing unnecessary personal information.

## Security

- Keep `OPENAI_API_KEY` on the backend only.
- Never include the API key in React code or a `VITE_` environment variable.
- Configure `ALLOWED_ORIGINS` with the exact deployed frontend origin.
- Keep rate limiting enabled on public AI endpoints.
- Configure OpenAI project usage limits and billing alerts.
- Do not log uploaded Base64 image data.
- Rotate the API key immediately if it is exposed or committed.

Recommended `.gitignore` entries:

```gitignore
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# Dependencies and build output
node_modules/
dist/
dist-ssr/
*.local

# Environment variables and secrets
.env
.env.*
!.env.example

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea/
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
```

A safe `.env.example` may contain placeholders:

```env
OPENAI_API_KEY=replace_with_your_server_side_key
OPENAI_ANALYSIS_MODEL=gpt-5.6
OPENAI_CHAT_MODEL=gpt-5.6
ALLOWED_ORIGINS=http://localhost:5173
TRUST_PROXY_HOPS=
```

## Free Deployment Option

The application can be deployed on Render using:

- A Static Site for the React/Vite frontend
- A Web Service for the Node/Express backend

Suggested backend settings:

```text
Build command: npm install
Start command: npm start
Health check path: /api/health
```

Suggested frontend settings:

```text
Build command: npm install && npm run build
Publish directory: dist
```

Set the deployed frontend variable:

```env
VITE_API_BASE_URL=https://your-backend-domain.example
```

Set the deployed backend variable:

```env
ALLOWED_ORIGINS=https://your-frontend-domain.example
```

Free backend services may sleep after inactivity and can take additional time
to respond to the first request. Open the backend health endpoint shortly before
a live demonstration. Hosting may be free, but OpenAI API usage may still incur
charges.

## Devpost Links

Add public links when available:

```text
Live Demo: https://your-frontend-domain.example
Source Code: https://github.com/your-username/ai-appliance-helper
Demo Video: https://youtu.be/your-video-id
```

Do not publish `localhost` links because judges cannot access them. If the live
site is not available, provide a public source-code repository and a demo video.

## Main Changes in the Reviewed Revision

- Prevented cancelled or stale requests from overwriting newer UI state.
- Preserved detailed analysis formatting and added dashboard-specific safety guidance.
- Moved analysis rules into the Responses API instruction field.
- Added a 1,500-character frontend chat limit.
- Normalized trailing slashes in the frontend API base URL.
- Added optional proxy-aware rate-limiting configuration.
- Added an aggregate conversation-size limit.
- Clarified that the health endpoint reports configuration rather than provider availability.
- Added stricter server-side image validation and safer API error responses.
- Improved modal focus management, responsive scrolling, and reduced-motion support.

## Important Notice

AI-generated image analysis may be incomplete or incorrect. Users should verify
important information with the applicable manual or manufacturer documentation.
Electrical, gas, refrigerant, internal mechanical, braking, overheating,
oil-pressure, and other safety-critical concerns should be handled by a qualified
service professional.

## License

Add the license selected for the project before publishing the repository. If
you do not intend to grant reuse rights, do not claim an open-source license.
