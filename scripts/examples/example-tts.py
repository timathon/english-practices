import os
import wave
from google import genai
from google.genai import types

# Initialize the client (Make sure your GEMINI_API_KEY environment variable is set)
client = genai.Client()

# 1. Ask the model to generate the audio
response = client.models.generate_content(
    model="gemini-2.5-flash-preview-tts",
    contents="Say cheerfully: Welcome to the project! We are so glad to have you here.",
    config=types.GenerateContentConfig(
        response_modalities=["AUDIO"],
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(
                    voice_name="Kore" # You can change this to other voices
                )
            )
        )
    )
)

# 2. Save the output to a .wav file
with wave.open("output.wav", "wb") as wf:
    wf.setnchannels(1)       # Mono audio
    wf.setsampwidth(2)       # 16-bit
    wf.setframerate(24000)   # 24kHz sample rate
    wf.writeframes(response.candidates[0].content.parts[0].inline_data.data)

print("Audio saved successfully to output.wav!")