# Getting Started

Simple Node JS example.

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create a `.env` file in the root directory with the following variables:

```env
OPENAI_API_KEY=your_open_ai_key
LLM_HOST=https://api.ai.it.cornell.edu
PORT=3000
```

### 3. Run the Application
```bash
npm start
```

The server will run on the port specified in your `.env` file (default: 3000).

## What this demo shows
- AI chat that converts user messages to philosophical questions
- Text-to-speech generation with customizable voice characteristics
- Environment variable configuration for easy deployment and customization

## Additional notes
- Never commit your `.env` file to version control
- Keep your API keys secure
- The `.env` file is already in `.gitignore` to prevent accidental commits
