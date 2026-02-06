import os
import torch
from flask import Flask, request, send_file

# --- 🛠️ PYTORCH 2.6 FIX START 🛠️ ---
# PyTorch 2.6 blocks "unsafe" globals by default. We need to force it to allow them
# or else Coqui TTS cannot load its own model files.
try:
    _original_load = torch.load
    def custom_load(*args, **kwargs):
        # Force weights_only=False to mimic old PyTorch behavior
        if 'weights_only' not in kwargs:
            kwargs['weights_only'] = False
        return _original_load(*args, **kwargs)
    
    torch.load = custom_load
    print("🔧 Applied PyTorch 2.6 security patch.")
except Exception as e:
    print(f"⚠️ Could not apply patch: {e}")
# --- 🛠️ FIX END 🛠️ ---

from TTS.api import TTS

# 1. Setup Device
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"🚀 Loading Coqui XTTS on {device}...")

# 2. Load Model
# This line was crashing before. The patch above fixes it.
tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)

app = Flask(__name__)

# 3. Path to your voice sample
# Ensure this file exists in the folder!
SPEAKER_WAV = "reference.mp3" 

@app.route('/tts', methods=['POST'])
def generate_speech():
    data = request.json
    text = data.get("text")
    # Default to English but allow language override
    lang = data.get("language", "en") 
    
    if not text: 
        return {"error": "No text provided"}, 400

    print(f"🗣️  Generating ({lang}): {text}")
    output_file = "output.wav"
    
    try:
        tts.tts_to_file(text=text, speaker_wav=SPEAKER_WAV, language=lang, file_path=output_file)
        return send_file(output_file, mimetype="audio/wav")
    except Exception as e:
        print(f"❌ Error generating audio: {e}")
        return {"error": str(e)}, 500

if __name__ == '__main__':
    print("✅ TTS Server running on port 5000")
    app.run(host='0.0.0.0', port=5000)