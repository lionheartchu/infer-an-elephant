# Infer an Elephant

Exploring Machine Hallucinations in LLMs through Partial and Ambiguous Perception

A Next.js web application demonstrating AI capabilities including animal recognition, vision processing, audio I/O, and conversation interfaces.

## Features

- Animal recognition and classification using Baidu AI
- OpenAI GPT integration for conversations, vision, and audio processing
- Real-time image processing and analysis
- Speech generation and recording
- Serial port communication for hardware integration

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Environment variables configured (see below)

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file in the root directory (copy from `.env.example`):

```bash
# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here

# LLM Host (e.g., OpenAI official or school gateway)
LLM_HOST=https://api.ai.it.cornell.edu

# ElevenLabs API (optional, for voice features)
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Baidu API (optional, for animal recognition)
BAIDU_AK=your_baidu_ak_here
BAIDU_SK=your_baidu_sk_here
```

### Running Locally

```bash
npm run dev
```

The application will be available at:
- **Localhost**: `http://localhost:8080`
- **Network access**: `http://YOUR_IP_ADDRESS:8080`

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

- `/src/app` - Next.js App Router pages and API routes
- `/src/app/examples` - Example pages demonstrating various features
- `/src/app/api` - Server-side API routes
- `/src/components` - React components
- `/data` - Data files for animal recognition
- `/scripts` - Utility scripts

## Security Note

**Never commit `.env` files** - they contain sensitive API keys. The `.env.example` file provides a template without actual keys.

## License

This project is part of research on machine hallucinations in LLMs.
