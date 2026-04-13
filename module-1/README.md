# 🧩 Module 1: Intelligence Intake Gateway

This is the **Input & Contract Module** of the Elite Agentic Web Scraping framework. It transforms natural language requirements into structured, machine-readable JSON contracts ready for processing by the intelligence and routing layers.



## 🚀 Key Features

- **Natural Language Parsing**: Uses LLMs (OpenRouter) to interpret user intent.
- **Conversational Clarification**: Automatically asks follow-up questions if critical info is missing.
- **Target Profiling**: Injects automated flags for `proxy_tier`, `anti_bot_risk`, and `authentication_required`.
- **Validation**: Uses strict `zod` schemas to ensure data integrity.
- **Documentation**: built-in Swagger UI (FastAPI docs style).

---

## 💻 Setup & Installation

Follow these steps to run Module 1 on any system with Node.js installed.

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **OpenRouter API Key**: A valid key from [OpenRouter](https://openrouter.ai/) for LLM processing.

### 2. Configuration
Create a `.env` file in the **root directory** (one level above this folder) and add your API key:
```env
OPENROUTER_API_KEY=your_actual_key_here
```
*Note: The application is configured to look for the `.env` file in the parent directory to keep secrets separate from source code.*


### 3. Install Dependencies

**Location:** `agentic-research/module-1`

Navigate into the `module-1` directory and run:
```bash
npm install
```

### 4. Start the Server
Start the backend gateway server using `ts-node`:
```bash
npx ts-node server.ts
```
The server will start on `localhost:3000`.

### 5. Start the UI Portal (Optional)

**Location:** `agentic-research/ui-portal`

If you also want to use the graphical chat interface, navigate into the `ui-portal` directory and run:
```bash
npm install
npm run dev
```
The UI will typically be available at `http://localhost:5173`. Make sure the Backend Server (Step 4) is running simultaneously!

---

## 🔍 How to Test

Once the server is running, you can interact with it in two ways:

### A. Swagger API Docs (Recommended)
Navigate to: **[http://localhost:3000/docs](http://localhost:3000/docs)**
- Click on the `POST /api/v1/intake` route.
- Click **"Try it out"**.
- Edit the `messages` array with a natural language prompt (e.g., *"Scrape flights from Delhi to Detroit on Air India"*).
- Click **Execute** to see the structured output.

### B. REST Client
Send a `POST` request to `http://localhost:3000/api/v1/intake`:
```json
{
  "messages": [
    { "role": "user", "content": "Scrape shoes from amazon.com" }
  ]
}
```

---

## 📂 Project Structure
- `server.ts`: The Express.js entry point and LLM gateway.
- `src/module_1/schema.ts`: The Zod validation contract.
- `src/orchestrator/router.ts`: The bridge to the downstream Intelligence Router.
- `logs/`: Internal module logs (`api.log` & `openrouter.log`).

---

## 🤝 Module 2 Integration
This module outputs a `module_1_event` containing the `INPUT_CONTRACT_VALIDATED` event type. Your downstream module (Module 2) should be ready to receive this exact JSON schema via its event listener.
