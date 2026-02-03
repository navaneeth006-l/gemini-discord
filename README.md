# 💢 TsundereBot (AI Chat + Local TTS)

> *"It's not like I wanted to be your Discord bot or anything... baka!"*

**TsundereBot** is a highly interactive Discord bot that brings anime characters to life using **Hybrid AI**. It uses **Google Gemini** (Cloud) OR **Ollama** (Local) for intelligence, paired with a **Python Microservice (Coqui TTS)** to generate realistic voice replies in real-time. It also functions as a local music player with smart shuffling.

![NodeJS](https://img.shields.io/badge/Node.js-v18+-green) ![Python](https://img.shields.io/badge/Python-3.10+-blue) ![Ollama](https://img.shields.io/badge/AI-Ollama-black) ![Gemini](https://img.shields.io/badge/AI-Gemini_Flash-blue) ![Coqui TTS](https://img.shields.io/badge/AI-Coqui_XTTS-orange)

## ✨ Features

* **🧠 Dual-Brain Engine:**
  * **Mode A (Cloud):** Uses Google Gemini 1.5 Flash for high-speed, smart responses.
  * **Mode B (Local):** Uses **Ollama** (Llama3 / Phi-3) for completely offline privacy.
* **🗣️ Real-time Voice (TTS):** Generates voice replies locally using Coqui XTTS v2 (requires GPU).
* **🎵 Music Player:** Plays local MP3 files with **Smart History** (remembers what it played).
* **⚡ Slash Commands:** Full support for `/roast`, `/whatif`, `/summarize`, and more.
* **💬 Context Aware:** Can read replied-to messages and perform tasks on them.

---

## 🛠️ Architecture

This project runs as a system of microservices:

1.  **Node.js Bot (`index.js`):** The main controller. Handles Discord events and music logic.
2.  **Python TTS Server (`tts_server.py`):** An API that turns text into audio using your GPU.
3.  **Ollama (Optional):** Runs the LLM locally if you don't want to use Gemini.

---

## 📋 Prerequisites

* **Node.js** (v18 or higher)
* **Python** (v3.10 recommended)
* **FFmpeg** (Required for audio streaming)
* **NVIDIA GPU** (RTX 3060 or better recommended for smooth TTS).
* **Ollama** (If running local LLM).

---

## 🚀 Installation Guide

### 1. Clone the Repository
```bash
git clone [https://github.com/YOUR_USERNAME/tsundere-bot.git](https://github.com/YOUR_USERNAME/tsundere-bot.git)
cd tsundere-bot