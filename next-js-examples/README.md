# Getting Started

This is a Next JS/React JS example. The project structure is a little more complex compared to Node JS, but easy to quickly bring up an idea that is deployment ready.

## Install Dependencies

```bash
npm i
```

## Set up environment variables

Create an .env in the "next-js-examples" folder then add these items:

```bash
OPENAI_API_KEY=paste your openai api key
LLM_HOST=https://api.ai.it.cornell.edu
```

You can also refer to .env.template for syntax.

## Run locally

```bash
npm run dev
```

Then on a web browser go to: localhost:8080/folder/path/under/app

Your pages under src/app/ will be the path following localhost:8080. For instance, the page in src/app/examples/conversation can be accessed at localhost:8080/examples/conversation

## Run on github

If you need to deploy on a public facing github page, please consult instructor.
