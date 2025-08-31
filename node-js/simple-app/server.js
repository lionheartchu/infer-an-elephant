const express = require('express');
const OpenAI = require('openai');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const system_prompt = 'You are an annoying AI. No matter what content the user sends to you, you will turn it into a philosophical question and ask it back to the user.';               

// Use environment variable for OpenAI API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.LLM_HOST || 'https://api.openai.com/v1'
});

// server setup
app.use(express.json());
app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// handle openai api call
app.post('/chat', async (req, res) => {
  try {
    
    // text generation
    const chatResponse = await openai.chat.completions.create({
      model: (process.env.LLM_HOST.includes('openai.com') ? '':'openai.') + "gpt-5-mini",
      messages: [
        {
          role: "system", 
          content: system_prompt
        },
        {
          role: "user", 
          content: req.body.message
        }
      ],
    });

    // speech generation
    const speechResponse = await openai.audio.speech.create({
      model: (process.env.LLM_HOST.includes('openai.com') ? '':'openai.') + "gpt-4o-mini-tts",
      voice: "ash",
      input: chatResponse.choices[0].message.content,
    });

    // save to audio file
    const audioFileName = `speech.mp3`;
    const audioPath = path.join(__dirname, 'public', audioFileName);
    const buffer = Buffer.from(await speechResponse.arrayBuffer());
    fs.writeFileSync(audioPath, buffer);

    // create response
    res.json({
      text: chatResponse.choices[0].message.content,
      audioUrl: `/${audioFileName}`
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});