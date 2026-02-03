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
```
### 2. Setup the Discord Bot (Node.js)
```bash
#Install Node dependencies
npm install
```
### 3.Setup the TTS Server (Python)
It is reccomended to use a virtual environment.
```bash
#Create virtal env
python -m venv venv
#Activate it (Windows)
.\venv\Scripts\activate
#Install Python Requirements
pip install torch torchvision torchaudio --index-url [https://download.pytorch.org/whl/cu118](https://download.pytorch.org/whl/cu118)
pip install TTS flask requests
```
### 4.Setup Ollama (Optional)
If you want to use the local brain instead of Gemini:
1.Download Ollama.
2.Pull a lightweight model (recommended for speed alongside TTS):
```bash
ollama pull phi3:mini
```
## ⚙️Configuration 
Create a .env file in the root folder and add your keys:
```bash
# --- Discord Config ---
DISCORD_TOKEN=your_discord_bot_token_here

# --- Brain Config (Choose One) ---
# Option 1: Gemini (Cloud - Faster)
GEMINI_API=your_google_gemini_api_key
MODEL_NAME=gemini-1.5-flash

# Option 2: Ollama (Local - Private)
# (Configure inside index.js to switch to local fetch)
OLLAMA_MODEL=phi3:mini
```
## ▶️ Usage
You need two terminal windows open to run this bot.

Terminal 1: Start the TTS Engine
```bash
# Activate your python venv first!
python tts_server.py
```
Wait until you see: Running on http://127.0.0.1:5000

Terminal 2: Start the Discord Bot
```bash
node index.js
```
## 🎮 Commands

### Chat & Fun

| Command | Description |
| :--- | :--- |
| `/roast @user` | Generates a savage roast for the target user. |
| `/whatif [scenario]` | Asks the bot a hypothetical question. |
| `/summarize [text]` | Summarizes a long text block with attitude. |
| `/pat` | Headpat the bot (Trigger flustered response). |
| `/praise` | Praise the bot (Trigger arrogant response). |
| `.` (Dot command) | Chat normally. Example: `.Hello how are you?` |
### Music & Voice
| Command | Description |
| :--- | :--- |
| `/play [filename/all]` | Plays a specific song or shuffles all. |
| `/stop` | Stops audio and disconnects. |
| `/skip` | Skips the current song. |
| `/list` | Lists available local MP3 files. |
| `/connect` | Summons bot to voice channel without playing. |
### 🔧 Troubleshooting
**1. "System Error" / 500 on TTS.**
- Check if reference.wav or reference.mp3 exists in the tts-service folder.
- Ensure the filename matches exactly what is in tts_server.py.

**2. TTS is slow (20s+) or "Ollama crash".**
- Your GPU VRAM is full.
- If running Ollama + TTS on a laptop (8GB VRAM), switch Ollama to phi3:mini or use Gemini.
- Close your web browser to free up GPU memory.

**3. Bot replies twice.**
- You have two terminals open. Check Task Manager and kill any extra node processes.
### 📜 License
MIT License. Feel free to fork and modify!