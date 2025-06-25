# Hyfa

A Slack bot powered by AI.

## Environment Setup

Create a `.env` file in the root directory with the following variables:

```
# Slack API tokens
SLACK_BOT_TOKEN=
SLACK_SIGNING_SECRET=
SLACK_APP_TOKEN=xapp-

# LLM API endpoint and token
LLM_API_ENDPOINT=
LLM_API_TOKEN=
```

## Development

### Prerequisites

- Node.js (version >= 22.0.0)
- npm

### Installation

```bash
npm run setup
```

### Run in development mode

```bash
npm run dev
```

### Run in production mode

```bash
npm start
```

## Docker Deployment

### Build and run with Docker

```bash
# Build the Docker image
docker build -t hyfa-bot .

# Run the container
docker run -d --name hyfa-bot --env-file .env hyfa-bot
```
