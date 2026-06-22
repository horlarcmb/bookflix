import urllib.request
import json
import os

live_url = "https://bookflix-production.up.railway.app"

# Load local databases
with open("server_data/books.json", "r", encoding="utf-8") as f:
    books = json.load(f)

with open("server_data/book_contents.json", "r", encoding="utf-8") as f:
    contents = json.load(f)

# Update local books with empty covers to use placeholder
updated = False
for b in books:
    if not b.get("cover"):
        b["cover"] = "/covers/placeholder.png"
        updated = True

if updated:
    with open("server_data/books.json", "w", encoding="utf-8") as f:
        json.dump(books, f, indent=2)
    print("Updated local covers to use placeholder.")

# Login and upload missing books to Railway
try:
    login_url = f"{live_url}/api/auth/login"
    login_data = json.dumps({
        "email": "rahmanridwanidowu@gmail.com",
        "password": "BookFlix@Optimus2026!"
    }).encode('utf-8')
    
    login_req = urllib.request.Request(
        login_url,
        data=login_data,
        headers={'Content-Type': 'application/json', 'User-Agent': 'BookFlixApp/1.0'}
    )
    
    with urllib.request.urlopen(login_req, timeout=15) as login_resp:
        login_res = json.loads(login_resp.read().decode('utf-8'))
        token = login_res.get("token")
        
    if token:
        print("Login successful. Uploading books...")
        # Upload Alice (11) and Sherlock Holmes (1661)
        for target_id in [11, 1661]:
            b_meta = next(b for b in books if b["id"] == target_id)
            b_cont = contents[str(target_id)]
            
            print(f"Uploading {b_meta['title']} to live server...")
            upload_url = f"{live_url}/api/books"
            upload_data = json.dumps({
                "metadata": b_meta,
                "content": b_cont
            }).encode('utf-8')
            
            upload_req = urllib.request.Request(
                upload_url,
                data=upload_data,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {token}',
                    'User-Agent': 'BookFlixApp/1.0'
                }
            )
            
            with urllib.request.urlopen(upload_req, timeout=25) as upload_resp:
                if upload_resp.status in (200, 201):
                    print(f"  Uploaded successfully.")
                else:
                    print(f"  Status code: {upload_resp.status}")
    else:
        print("Login failed: no token.")
except Exception as e:
    print(f"Error during upload: {e}")
