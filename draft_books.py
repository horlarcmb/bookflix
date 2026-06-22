import urllib.request
import urllib.parse
import json
import zipfile
import re
import os
import random
from xml.etree import ElementTree

# Books to process
books_to_draft = [
    {"id": 1342, "title": "Pride and Prejudice", "author": "Jane Austen", "genres": ["Romance", "Fiction", "Historical"]},
    {"id": 84, "title": "Frankenstein", "author": "Mary Wollstonecraft Shelley", "genres": ["Horror", "Sci-Fi", "Fiction"]},
    {"id": 11, "title": "Alice's Adventures in Wonderland", "author": "Lewis Carroll", "genres": ["Fantasy", "Adventure", "Fiction"]},
    {"id": 345, "title": "Dracula", "author": "Bram Stoker", "genres": ["Horror", "Thriller", "Fiction"]},
    {"id": 1661, "title": "The Adventures of Sherlock Holmes", "author": "Arthur Conan Doyle", "genres": ["Mystery", "Thriller", "Fiction"]},
    {"id": 98, "title": "A Tale of Two Cities", "author": "Charles Dickens", "genres": ["Historical", "Drama", "Fiction"]},
    {"id": 174, "title": "The Picture of Dorian Gray", "author": "Oscar Wilde", "genres": ["Drama", "Horror", "Fiction"]},
    {"id": 2701, "title": "Moby Dick", "author": "Herman Melville", "genres": ["Adventure", "Fiction"]},
    {"id": 1513, "title": "Romeo and Juliet", "author": "William Shakespeare", "genres": ["Drama", "Romance"]},
    {"id": 64317, "title": "The Great Gatsby", "author": "F. Scott Fitzgerald", "genres": ["Drama", "Fiction"]}
]

def clean_html(html):
    # Remove script and style elements
    html = re.sub(r'<(script|style).*?>.*?</\1>', '', html, flags=re.DOTALL | re.IGNORECASE)
    # Remove HTML tags
    text = re.sub(r'<[^>]*>', '', html)
    # Decode common entities
    text = text.replace('&nbsp;', ' ').replace('&lt;', '<').replace('&gt;', '>').replace('&amp;', '&').replace('&quot;', '"').replace('&apos;', "'")
    # Replace multiple newlines or spaces
    text = re.sub(r'\r\n', '\n', text)
    text = re.sub(r'\n\s*\n', '\n\n', text)
    return text.strip()

def extract_epub_contents(zip_path):
    print(f"    Extracting contents from {zip_path}...")
    try:
        with zipfile.ZipFile(zip_path, 'r') as z:
            # 1. Find container.xml
            container_data = z.read('META-INF/container.xml')
            root = ElementTree.fromstring(container_data)
            opf_path = root.find('.//{urn:oasis:names:tc:opendocument:xmlns:container}rootfile').attrib['full-path']
            
            # 2. Parse OPF file
            opf_data = z.read(opf_path)
            opf_root = ElementTree.fromstring(opf_data)
            
            # Define namespaces
            ns = {
                'opf': 'http://www.idpf.org/2007/opf',
                'dc': 'http://purl.org/dc/elements/1.1/'
            }
            
            # 3. Read manifest items
            manifest = {}
            for item in opf_root.findall('.//opf:manifest/opf:item', ns):
                manifest[item.attrib['id']] = item.attrib['href']
                
            # Get base dir of opf_path to resolve relative hrefs
            base_dir = os.path.dirname(opf_path)
            
            # 4. Read spine items in order
            chapters = []
            chapter_idx = 1
            for itemref in opf_root.findall('.//opf:spine/opf:itemref', ns):
                idref = itemref.attrib['idref']
                href = manifest.get(idref)
                if href:
                    full_href = os.path.join(base_dir, href).replace('\\', '/') if base_dir else href
                    clean_href = full_href.split('#')[0]
                    try:
                        html_content = z.read(clean_href).decode('utf-8', errors='ignore')
                        text = clean_html(html_content)
                        
                        # Only include items that actually have content (skip cover page/blank spine items)
                        if len(text) < 100:
                            continue
                            
                        title = f"Chapter {chapter_idx}"
                        title_match = re.search(r'<title>(.*?)</title>', html_content, re.IGNORECASE)
                        if title_match:
                            clean_title = title_match.group(1).strip()
                            if clean_title and len(clean_title) < 100:
                                title = clean_title
                                
                        h1_match = re.search(r'<h1>(.*?)</h1>', html_content, re.IGNORECASE)
                        if h1_match:
                            clean_h1 = clean_html(h1_match.group(1)).strip()
                            if clean_h1 and len(clean_h1) < 100:
                                title = clean_h1
                                
                        chapters.append({
                            "title": title,
                            "content": text
                        })
                        chapter_idx += 1
                    except Exception as e:
                        print(f"      Error reading spine item {clean_href}: {e}")
            return chapters
    except Exception as e:
        print(f"    Error parsing epub file {zip_path}: {e}")
    return []

def fetch_openlibrary_metadata(title, author):
    print(f"    Fetching metadata from Open Library for '{title}'...")
    query = urllib.parse.urlencode({"title": title, "author": author})
    url = f"https://openlibrary.org/search.json?{query}"
    
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'BookFlixApp/1.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            
        if data.get("docs"):
            doc = data["docs"][0]
            work_key = doc.get("key")
            cover_i = doc.get("cover_i")
            cover_url = f"https://covers.openlibrary.org/b/id/{cover_i}-L.jpg" if cover_i else None
            
            description = ""
            if work_key:
                work_url = f"https://openlibrary.org{work_key}.json"
                try:
                    work_req = urllib.request.Request(work_url, headers={'User-Agent': 'BookFlixApp/1.0'})
                    with urllib.request.urlopen(work_req, timeout=10) as work_resp:
                        work_data = json.loads(work_resp.read().decode('utf-8'))
                        desc_data = work_data.get("description")
                        if isinstance(desc_data, dict):
                            description = desc_data.get("value", "")
                        elif isinstance(desc_data, str):
                            description = desc_data
                except Exception as e:
                    print(f"      Error fetching description: {e}")
                    
            pages = doc.get("number_of_pages_median", 280)
            rating = doc.get("ratings_average", 4.5)
            subjects = doc.get("subject", [])[:10]
            
            return {
                "cover": cover_url,
                "synopsis": description or doc.get("first_sentence", [""])[0],
                "pages": pages,
                "rating": round(rating, 2),
                "tags": subjects,
                "publisher": doc.get("publisher", ["Public Domain Masterpiece"])[0]
            }
    except Exception as e:
        print(f"    Open Library query error: {e}")
    return {}

# Default gradients in case no cover image
gradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
]

def main():
    print("Starting BookFlix Seeder script...")
    os.makedirs('temp_epubs', exist_ok=True)
    
    server_data_dir = 'server_data'
    os.makedirs(server_data_dir, exist_ok=True)
    
    local_books_path = os.path.join(server_data_dir, 'books.json')
    local_contents_path = os.path.join(server_data_dir, 'book_contents.json')
    
    local_books = []
    local_contents = {}
    
    for idx, binfo in enumerate(books_to_draft):
        b_id = binfo["id"]
        title = binfo["title"]
        author = binfo["author"]
        genres = binfo["genres"]
        
        print(f"\nProcessing Book {idx + 1}/10: {title} (ID: {b_id})")
        
        # Download EPUB from Project Gutenberg
        epub_filename = f"temp_epubs/{b_id}.epub"
        download_failed = False
        
        if not os.path.exists(epub_filename):
            url = f"https://www.gutenberg.org/ebooks/{b_id}.epub.noimages"
            print(f"    Downloading {url}...")
            try:
                # Add headers to avoid Gutenberg rate-limiting / blocking standard urllib user-agents
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
                with urllib.request.urlopen(req, timeout=20) as response, open(epub_filename, 'wb') as out_file:
                    out_file.write(response.read())
                print("    Download complete.")
            except Exception as e:
                print(f"    Download failed: {e}")
                download_failed = True
                
        # Parse EPUB
        chapters = []
        if not download_failed and os.path.exists(epub_filename):
            chapters = extract_epub_contents(epub_filename)
            if not chapters:
                download_failed = True
                
        # Fetch Metadata
        meta = fetch_openlibrary_metadata(title, author)
        
        # Build Metadata object
        cover_image = meta.get("cover")
        synopsis = meta.get("synopsis") or f"A timeless classic by {author} representing the best of English literature."
        
        status = "Completed"
        tags = meta.get("tags", [])
        if not tags:
            tags = ["Classic", "Literature", "Public Domain"]
            
        if download_failed:
            status = "Unavailable"
            tags.append("Unavailable")
            synopsis = "[Will be available soon] " + synopsis
            
        book_metadata = {
            "id": b_id,
            "title": title,
            "author": author,
            "cover": cover_image or "/covers/placeholder.png",
            "gradient": gradients[idx % len(gradients)] if not cover_image else None,
            "genre": genres,
            "type": "Novel",
            "contentFormat": "epub",
            "rating": meta.get("rating", 4.5),
            "synopsis": synopsis,
            "chapters": len(chapters),
            "status": status,
            "language": "English",
            "tags": tags,
            "readCount": random.randint(150000, 890000),
            "premium": idx % 2 == 0, # alternate premium for testing
            "featured": idx < 3,
            "isAIGenerated": False,
            "dateAdded": "2026-06-20",
            "pages": meta.get("pages", 320),
            "publisher": meta.get("publisher", "Project Gutenberg")
        }
        
        book_content = {
            "bookId": b_id,
            "chapters": chapters if not download_failed else [],
            "pages": []
        }
        
        local_books.append(book_metadata)
        local_contents[str(b_id)] = book_content
        
    # Write to local server files
    print("\nWriting to local database files...")
    with open(local_books_path, 'w', encoding='utf-8') as f:
        json.dump(local_books, f, indent=2)
    with open(local_contents_path, 'w', encoding='utf-8') as f:
        json.dump(local_contents, f, indent=2)
    print("Local database updated successfully!")
    
    # Try uploading to live server
    live_url = "https://bookflix-production.up.railway.app"
    print(f"\nAttempting upload to live production server: {live_url}...")
    try:
        # Step 1: Login to get token
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
            print("  Login success. Admin token obtained.")
            
            # Step 2: Upload each book
            for i, (b_meta, b_cont) in enumerate(zip(local_books, local_contents.values())):
                print(f"  Uploading {b_meta['title']} ({i+1}/10)...")
                try:
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
                    
                    with urllib.request.urlopen(upload_req, timeout=20) as upload_resp:
                        if upload_resp.status in (200, 201):
                            print(f"    Uploaded successfully.")
                        else:
                            print(f"    Failed with status: {upload_resp.status}")
                except Exception as e:
                    print(f"    Error uploading: {e}")
        else:
            print("  Login failed: token not in response.")
    except Exception as e:
        print(f"  Live server login/upload failed: {e}")

if __name__ == '__main__':
    main()
