import requests
import os
from urllib.parse import unquote

# List of audio file URLs
audio_urls = [
    "/Upload/Quiz/Lesson 9-Track 013-Final Test.mp3",
    "/Upload/Quiz/Lesson 9-Track 014-Final Test (mp3cut.net) (1).mp3",
    "/Upload/Quiz/Lesson 9-Track 014-Final Test.mp3",
    "/Upload/Quiz/Lesson 9-Track 015-Final Test (mp3cut.net).mp3",
    "/Upload/Quiz/Lesson 9-Track 016-Final Test (mp3cut.net).mp3",
    "/Upload/Quiz/Lesson 9-Track 017-Final Test (mp3cut.net).mp3",
    "/Upload/Quiz/Lesson 9-Track 018-Final Test (mp3cut.net).mp3",
    "/Upload/Quiz/Lesson 9-Track 019-Final Test (mp3cut.net).mp3",
    "/Upload/Quiz/Lesson 9-Track 020-Final Test (mp3cut.net).mp3",
    "/Upload/Quiz/Lesson 9-Track 021-Final Test (mp3cut.net) (2).mp3",
    "/Upload/Quiz/Lesson 9-Track 021-Final Test (mp3cut.net).mp3",
    "/Upload/Quiz/Lesson 9-Track 022-Final Test(1) (mp3cut.net).mp3",
    "/Upload/Quiz/Lesson 9-Track 023-Final Test (mp3cut.net).mp3",
    "/Upload/Quiz/Lesson 9-Track 024-Final Test (mp3cut.net).mp3",
    "/Upload/Quiz/Lesson 9-Track 025-Final Test (mp3cut.net).mp3",
    "/Upload/Quiz/Lesson 9-Track 026-Final Test (mp3cut.net).mp3",
    "/Upload/Quiz/Lesson 9-Track 027-Final Test (mp3cut.net).mp3",
    "/Upload/Quiz/Lesson 9-Track 028-Final Test (mp3cut.net).mp3",
    "/Upload/Quiz/Lesson 9-Track 029-Final Test (mp3cut.net).mp3",
    "/Upload/Quiz/Lesson 9-Track 030-Final Test (mp3cut.net) - Copy 1.mp3"
]

# Base URL for the audio files
base_url = "https://demo.tienganhk12.com"

# Folder to save audio files
output_folder = "downloaded_audio"
os.makedirs(output_folder, exist_ok=True)

# Download each audio file
for audio_path in audio_urls:
    url = base_url + audio_path
    filename = audio_path.split("/")[-1]
    # Decode URL-encoded characters in filename
    filename = unquote(filename)
    print(f"Downloading {url}...")

    try:
        response = requests.get(url)
        if response.status_code == 200:
            with open(os.path.join(output_folder, filename), "wb") as f:
                f.write(response.content)
            print(f"✅ Saved as {filename}")
        else:
            print(f"❌ Failed: {url} (Status {response.status_code})")
    except Exception as e:
        print(f"❌ Error: {url} -> {e}")


# const paths = Array.from(document.querySelectorAll('#pnlFileList [data-path]'))
#   .map(el => el.getAttribute('data-path'));

# console.log(paths);