# AI Appliance Helper

AI Appliance Helper is a React and Node.js application that analyzes photos of
home appliances, controls, labels, error messages, and vehicle dashboards. It
uses the OpenAI Responses API with vision capabilities to provide practical,
safety-aware guidance and contextual follow-up chat.

## Features

- Upload or capture JPEG, PNG, and WebP images.
- Identify visible appliances, controls, labels, and dashboard symbols.
- Explain settings, maintenance, troubleshooting steps, and safety concerns.
- Ask contextual follow-up questions after an image analysis.
- Validate image type, signature, and size on the frontend and backend.
- Handle request timeouts, cancellation, malformed responses, and API errors.
- Support keyboard navigation, reduced motion, screen-reader status messages,
  and responsive mobile layouts.
- Protect AI endpoints with CORS restrictions, request-size limits, and rate
  limiting.

The MVP does not require a database and does not intentionally persist uploaded
images or conversations.

## Technology

- React 19, TypeScript, Vite, React Markdown, and Remark GFM
- Node.js, Express, OpenAI Node SDK, CORS, dotenv, and Express Rate Limit
- OpenAI Responses API with image input,GPT 5.6 ,Codex

## Repository Structure

```text
ai-appliance-helper/
├── frontend/             React/Vite application
│   ├── src/App.tsx
│   ├── src/App.css
│   └── package.json
├── server/               Express API
│   ├── server.js
│   └── package.json
└── README.md
```

## Prerequisites

- Node.js 20 or later
- npm
- An OpenAI API key with access to the configured models

## Local Setup

Install dependencies:

```bash
cd server
npm install

cd ../frontend
npm install
```

Create `server/.env`:

```env
OPENAI_API_KEY=your_server_side_key
OPENAI_ANALYSIS_MODEL=gpt-5.6
OPENAI_CHAT_MODEL=gpt-5.6
ALLOWED_ORIGINS=http://localhost:5173
PORT=3001
```

`OPENAI_CHAT_MODEL` defaults to `OPENAI_ANALYSIS_MODEL`, and `PORT` defaults to
`3001`. Set `TRUST_PROXY_HOPS=1` only when the server is behind exactly one
trusted reverse proxy; otherwise leave it unset.

Optionally create `frontend/.env.local`:

```env
VITE_API_BASE_URL=http://localhost:3001
```

In development the frontend defaults to `http://localhost:3001`. In production,
an omitted `VITE_API_BASE_URL` uses same-origin `/api` requests, which is suitable
when a reverse proxy serves the frontend and backend on one origin. Set it to the
public HTTPS backend URL when the services use different origins.

Start the backend from `server/`:

```bash
npm start
```

Start the frontend from `frontend/` in another terminal:

```bash
npm run dev
```

The default local addresses are `http://localhost:5173` for the frontend and
`http://localhost:3001` for the backend. The liveness/configuration endpoint is
`http://localhost:3001/api/health`; it does not verify OpenAI availability or
quota.

## Validation

Run the frontend checks from `frontend/`:

```bash
npm run build
npm run lint
npm audit --omit=dev
```

Run the backend checks from `server/`:

```bash
node --check server.js
npm audit --omit=dev
```

## Image Requirements

- Supported formats: JPEG, PNG, and WebP
- Maximum decoded size: 8 MB
- Use clear lighting and keep labels, controls, and warning symbols visible.
- Do not upload private documents or unnecessary personal information.

## Security and Privacy

- Keep `OPENAI_API_KEY` on the backend only; never expose it through a `VITE_`
  variable or frontend source.
- Configure `ALLOWED_ORIGINS` with exact deployed frontend origins.
- Keep rate limiting enabled on the public analysis and chat endpoints.
- Configure OpenAI project usage limits and billing alerts before publishing.
- Do not log uploaded Base64 image data.
- Uploaded images and conversations are sent to the configured OpenAI API but
  are not intentionally stored by this application.
- Rotate the API key immediately if it is exposed or committed.

Environment files, dependencies, build output, and logs are excluded by the
repository `.gitignore`.

## Deployment

The application can be deployed as two services:

- A static Vite frontend built with `npm install && npm run build`, publishing
  `frontend/dist`.
- A Node web service built with `npm install` and started with `npm start` from
  the `server` directory.

For separate origins, set `VITE_API_BASE_URL` to the public backend HTTPS URL and
set `ALLOWED_ORIGINS` to the exact frontend HTTPS origin. For a same-origin
deployment, proxy `/api` to the backend. Use `/api/health` as the backend health
check path.

Free backend services may sleep after inactivity, so warm the backend before a
live demonstration. Hosting may be free, but OpenAI API usage can incur charges.

## Safety Notice

AI-generated image analysis can be incomplete or incorrect. Verify important
information with the applicable manual or official manufacturer documentation.
Electrical, gas, refrigerant, internal mechanical, braking, overheating,
oil-pressure, and other safety-critical concerns should be handled by a qualified
service professional.

## Submission Checklist

- Deploy the frontend and backend with production environment variables.
- Confirm the public demo from a signed-out browser and a mobile device.
- Set OpenAI usage limits and test rate limiting.
- Record a demo video and add the public demo, source, and video URLs to the
  submission platform.
- Select and add a license before representing the repository as open source.

## License

No open-source license has been granted. All rights are reserved unless a license
file is added to the repository.


## MVP User Flow

1.⁠ ⁠Take or upload a picture
2.⁠ ⁠Identify the appliance
3.⁠ ⁠Ask a question
4.⁠ ⁠Receive clear guidance
5.⁠ ⁠Continue the conversation if more help is needed



# GPT-5.6 Usage

GPT-5.6 powers the intelligent capabilities of the application, including:

- Image understanding
- Appliance recognition
- Control and display explanations
- Troubleshooting assistance
- Maintenance guidance
- Safety recommendations
- Context-aware follow-up conversations

GPT-5.6 serves as the AI engine that provides natural, conversational assistance based on the uploaded appliance image.

---

# Codex Usage

Codex was used during development to improve the software engineering aspects of the project, including:

- Code review and validation
- Debugging frontend and backend issues
- UI and CSS refinements
- React component improvements
- Backend API enhancements
- Error handling and validation
- Project documentation and README improvements

Codex accelerated development while GPT-5.6 powers the application's AI experience.



# Future Roadmap

- 🎙️ Voice conversations
- 🌍 Multi-language support
- 📄 Automatic manual retrieval
- 📹 Live camera mode
- 🔍 OCR for appliance labels
- ☁️ Cloud deployment
- 📱 Mobile application
- 🚗 Expanded vehicle dashboard assistance
- 🏠 Smart home device support

---

