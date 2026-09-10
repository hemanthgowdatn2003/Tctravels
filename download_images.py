import urllib.request
import json
import os
import sys

headers = {'User-Agent': 'TCTravelsMysore/2.0 (contact@tctravelsmysore.com)'}

def search_wikimedia_image(query):
    try:
        url = f"https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch={urllib.parse.quote(query)}&gsrnamespace=6&gsrlimit=5&prop=imageinfo&iiprop=url|size|mime"
        req = urllib.request.Request(url, headers=headers)
        data = json.loads(urllib.request.urlopen(req, timeout=10).read().decode('utf-8'))
        pages = data.get('query', {}).get('pages', {})
        for pid, page in pages.items():
            infos = page.get('imageinfo', [])
            if infos:
                img_url = infos[0].get('url')
                mime = infos[0].get('mime', '')
                if 'jpeg' in mime or 'jpg' in mime or 'png' in mime or 'webp' in mime:
                    # Prefer medium sized jpg
                    return img_url
    except Exception as e:
        print(f"Error searching {query}: {e}")
    return None

def download_file(url, target_path):
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as resp:
            content = resp.read()
            if len(content) > 10000:
                with open(target_path, 'wb') as f:
                    f.write(content)
                print(f"Downloaded {target_path} ({len(content)} bytes)")
                return True
    except Exception as e:
        print(f"Failed to download {url}: {e}")
    return False

queries = {
    "mysore-palace.jpg": "Mysore Palace illumination night",
    "mysore-palace-day.jpg": "Mysore Palace front facade",
    "chamundi-hill.jpg": "Chamundi Hills Mysore Nandi bull",
    "brindavan-gardens.jpg": "Brindavan Gardens KRS Mysore fountain",
    "coorg-hills.jpg": "Madikeri Abbey Falls Coorg",
    "ooty-tea.jpg": "Ooty tea garden Nilgiri",
    "maruti-dzire.jpg": "Maruti Suzuki Dzire car front",
    "innova-crysta.jpg": "Toyota Innova Crysta white",
    "maruti-ertiga.jpg": "Maruti Suzuki Ertiga white",
    "tempo-traveller.jpg": "Force Traveller van India",
    "toyota-etios.jpg": "Toyota Etios sedan",
    "toyota-fortuner.jpg": "Toyota Fortuner SUV",
    "maruti-swift.jpg": "Maruti Suzuki Swift car"
}

os.makedirs("images", exist_ok=True)

for fname, q in queries.items():
    target = os.path.join("images", fname)
    if os.path.exists(target) and os.path.getsize(target) > 10000:
        print(f"Already have {fname}")
        continue
    print(f"Searching: {q}...")
    img_url = search_wikimedia_image(q)
    if img_url:
        print(f"Found: {img_url}")
        success = download_file(img_url, target)
        if not success:
            print(f"Fallback needed for {fname}")
    else:
        print(f"No result for {q}")
