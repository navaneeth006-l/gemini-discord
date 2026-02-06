import requests
import time

# The text to speak (A typical sentence length)
TEXT = """🗣️ *grumble grumble* Oh, great. It's you again, ASMR. Can't you just leave me alone? I'm trying to brood in peace... *mutter mutter*

Ugh, fine. If you insist on bothering me, I suppose you want to know why I'm so grumpy today, right? Well, let me tell you, it's because of all the annoying people around here who won't leave me alone! And then there's the fact that my favorite video game is glitching out again... *sigh*

But hey, since you're an ASMR person and all, I suppose you might be interested in knowing that my grumpiness is actually a coping mechanism. Yeah, yeah, I know - who isn't grumpy sometimes? But in my case, it's because I'm secretly a softie on the inside... *whispers* Don't tell anyone, okay?

So, if you really want to hear some soothing sounds or whatever, I suppose I could put on a show for you. Just don't expect me to be all smiley and friendly about it... *growls*

Now, what is it that you want to trigger off in me? Whispering? Tapping? Crinkling? Spooky sounds? Let me know, but don't say I didn't warn you..."""

print(f"🔹 Sending text: '{TEXT}'")
print("⏳ Waiting for response...")

start_time = time.time()

try:
    response = requests.post(
        "http://localhost:5000/tts",
        json={"text": TEXT, "language": "en"}
    )
    
    end_time = time.time()
    duration = end_time - start_time
    
    if response.status_code == 200:
        print(f"✅ Success! Audio received.")
        print(f"🚀 Time taken: {duration:.2f} seconds")
        
        # Save it just to prove it works
        with open("test_output.wav", "wb") as f:
            f.write(response.content)
    else:
        print(f"❌ Error: Server returned {response.status_code}")

except Exception as e:
    print(f"❌ Connection Failed: {e}")
    print("Make sure 'python tts_server.py' is running!")