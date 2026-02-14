# Council of History: A Virtual Debate

An interactive AI-powered debate arena where historical figures (as of the current version, **Julius Caesar** and **George Washington**) clash over modern and historical topics. Built for the **NVIDIA GTC 2026 Golden Ticket Contest** https://developer.nvidia.com/gtc-golden-ticket-contest.

## Overview
This project demonstrates the power of **NVIDIA Nemotron-Mini** running locally. By leveraging Ollama and custom Modelfiles, I've fine-tuned the personas of two historical titans to engage in a multi-round, structured debate.

### Tech Stack
* **AI Model:** NVIDIA Nemotron-Mini (via Ollama)
* **Runtime:** Bun
* **Frontend:** React 19 + TypeScript
* **Build Tool:** Vite

## Prerequisites
Before running, ensure you have the following installed:
1.  [Bun](https://bun.sh/)
2.  [Ollama](https://ollama.com/) (Must be running in the background)

## How to Run
To get the project up and running with a single command:

```bash
# Install dependencies
bun install

# Setup models and start the development server
bun run dev