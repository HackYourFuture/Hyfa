# Meet Hyfa
<p align="center">
  <img src="Resources/Hyfa.jpeg" alt="Hyfa Avatar" width="200" height="200" style="border-radius: 50%;">
</p>
Hyfa (HackYourFuture Assistant) is an AI-powered Slack bot designed to serve as a virtual mentor for HackYourFuture.

Hyfa provides guidance, support, and resources to trainees throughout their coding journey, helping them navigate the curriculum and overcome technical challenges while encouraging independent problem-solving and growth.

### What Hyfa Can Help With

- Understanding web development concepts (HTML, CSS, JavaScript, Node.js, React.js, databases)
- Providing hints and guidance for coding problems without giving away complete solutions
- Offering advice on study methods and debugging strategies
- Supporting job search preparation, including CV building and interview tips
- Answering general questions about life in the Netherlands

Hyfa is designed to be accessible, friendly, and professional – always ready to assist but careful to empower students to develop their own problem-solving skills.

### How to use Hyfa
* You can send a private message to @hyfa at any time and she will respond in no time. 

* If Hyfa is a member of a Slack channel (private or public), you can tag her with @hyfa to get her attention to your question, she will look at the recent channel messages and try to provide the best answer.

* You can also tag @hyfa inside a Slack thread if you want her to join the conversation. Threads only work for group channels

* Creating a private group with multiple trainees? Why not adding Hyfa to help out if needed

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
