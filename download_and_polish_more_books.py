import urllib.request
import urllib.parse
import json
import os
import re
import random
import zipfile
from xml.etree import ElementTree

# 20 books (10 original + 10 new ones)
books_to_process = [
    # Original 10
    {"id": 1342, "title": "Pride and Prejudice", "author": "Jane Austen", "genres": ["Romance", "Fiction", "Historical"]},
    {"id": 84, "title": "Frankenstein", "author": "Mary Wollstonecraft Shelley", "genres": ["Horror", "Sci-Fi", "Fiction"]},
    {"id": 11, "title": "Alice's Adventures in Wonderland", "author": "Lewis Carroll", "genres": ["Fantasy", "Adventure", "Fiction"]},
    {"id": 345, "title": "Dracula", "author": "Bram Stoker", "genres": ["Horror", "Thriller", "Fiction"]},
    {"id": 1661, "title": "The Adventures of Sherlock Holmes", "author": "Arthur Conan Doyle", "genres": ["Mystery", "Thriller", "Fiction"]},
    {"id": 98, "title": "A Tale of Two Cities", "author": "Charles Dickens", "genres": ["Historical", "Drama", "Fiction"]},
    {"id": 174, "title": "The Picture of Dorian Gray", "author": "Oscar Wilde", "genres": ["Drama", "Horror", "Fiction"]},
    {"id": 2701, "title": "Moby Dick", "author": "Herman Melville", "genres": ["Adventure", "Fiction"]},
    {"id": 1513, "title": "Romeo and Juliet", "author": "William Shakespeare", "genres": ["Drama", "Romance"]},
    {"id": 64317, "title": "The Great Gatsby", "author": "F. Scott Fitzgerald", "genres": ["Drama", "Fiction"]},
    # New 10
    {"id": 1727, "title": "The Odyssey", "author": "Homer", "genres": ["Fantasy", "Adventure", "Historical"]},
    {"id": 74, "title": "The Adventures of Tom Sawyer", "author": "Mark Twain", "genres": ["Adventure", "Fiction"]},
    {"id": 219, "title": "Heart of Darkness", "author": "Joseph Conrad", "genres": ["Fiction", "Drama"]},
    {"id": 844, "title": "The Importance of Being Earnest", "author": "Oscar Wilde", "genres": ["Drama", "Romance"]},
    {"id": 2591, "title": "Grimms' Fairy Tales", "author": "Jacob Grimm and Wilhelm Grimm", "genres": ["Fantasy", "Adventure"]},
    {"id": 5200, "title": "Metamorphosis", "author": "Franz Kafka", "genres": ["Fiction", "Drama"]},
    {"id": 43, "title": "The Strange Case of Dr. Jekyll and Mr. Hyde", "author": "Robert Louis Stevenson", "genres": ["Horror", "Mystery", "Thriller"]},
    {"id": 35, "title": "The Time Machine", "author": "H. G. Wells", "genres": ["Sci-Fi", "Adventure"]},
    {"id": 33, "title": "The Scarlet Letter", "author": "Nathaniel Hawthorne", "genres": ["Historical", "Drama", "Fiction"]},
    {"id": 120, "title": "Treasure Island", "author": "Robert Louis Stevenson", "genres": ["Adventure", "Fiction"]}
]

def clean_html(html):
    html = re.sub(r'<(script|style).*?>.*?</\1>', '', html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<[^>]*>', '', html)
    text = text.replace('&nbsp;', ' ').replace('&lt;', '<').replace('&gt;', '>').replace('&amp;', '&').replace('&quot;', '"').replace('&apos;', "'")
    text = re.sub(r'\r\n', '\n', text)
    return text.strip()

def clean_gutenberg_noise(text, is_first=False, is_last=False):
    if is_first:
        start_markers = [
            r'\*\*\* START OF THE PROJECT GUTENBERG EBOOK .*? \*\*\*',
            r'\*\*\* START OF THIS PROJECT GUTENBERG EBOOK .*? \*\*\*',
            r'Produced by .*?\n',
            r'Release Date: .*?\n',
            r'Character set encoding: .*?\n'
        ]
        for marker in start_markers:
            match = re.search(marker, text, re.IGNORECASE)
            if match:
                text = text[match.end():]
                break

    if is_last:
        end_markers = [
            r'\*\*\* END OF THE PROJECT GUTENBERG EBOOK .*? \*\*\*',
            r'\*\*\* END OF THIS PROJECT GUTENBERG EBOOK .*? \*\*\*',
            r'End of the Project Gutenberg EBook',
            r'End of Project Gutenberg\'s',
            r'THE END',
            r'Project Gutenberg License'
        ]
        for marker in end_markers:
            match = re.search(marker, text, re.IGNORECASE)
            if match:
                text = text[:match.start()]
                break
    return text

def format_paragraphs(text):
    paragraphs = re.split(r'\n\s*\n', text)
    cleaned_paragraphs = []
    
    for p in paragraphs:
        cleaned_p = re.sub(r'(?<!\n)\n(?!\n)', ' ', p)
        cleaned_p = re.sub(r'[ \t]+', ' ', cleaned_p)
        cleaned_p = cleaned_p.strip()
        if cleaned_p:
            cleaned_paragraphs.append(cleaned_p)
            
    return '\n\n'.join(cleaned_paragraphs)

def clean_duplicate_headings(text, title):
    lines = text.split('\n')
    if not lines:
        return text
        
    clean_title = re.sub(r'[^a-zA-Z0-9]', '', title).lower()
    
    for i in range(min(8, len(lines))):
        line = lines[i].strip()
        clean_line = re.sub(r'[^a-zA-Z0-9]', '', line).lower()
        
        if (clean_line == clean_title or 
            re.match(r'^chapter\s*[ivxl0-9\s]+$', clean_line) or 
            re.match(r'^letter\s*[ivxl0-9\s]+$', clean_line) or
            re.match(r'^volume\s*[ivxl0-9\s]+$', clean_line) or
            re.match(r'^book\s*[ivxl0-9\s]+$', clean_line) or
            (len(line) < 60 and any(kw in line.upper() for kw in ["GUTENBERG", "PROLOGUE", "PREFACE", "EBOOK", "START OF"]))):
            lines[i] = ""
            
    return "\n".join(lines).strip()

def is_generic_title(title_str, book_title):
    if not title_str:
        return True
    t_clean = re.sub(r'[^a-zA-Z0-9]', '', title_str).lower()
    b_clean = re.sub(r'[^a-zA-Z0-9]', '', book_title).lower() if book_title else ""
    
    # If it is a standard allowed page like Preface/Introduction/Table of Contents/Title Page, it's not generic
    if any(k in title_str.lower() for k in ["preface", "introduction", "dedication", "foreword", "prologue", "contents", "illustration"]):
        return False
        
    if b_clean and t_clean == b_clean:
        return True
    if "projectgutenberg" in t_clean or "gutenbergebook" in t_clean:
        return True
    return False

def extract_epub_contents(zip_path, book_title=None):
    print(f"    Extracting & polishing contents from {zip_path}...")
    try:
        with zipfile.ZipFile(zip_path, 'r') as z:
            container_data = z.read('META-INF/container.xml')
            root = ElementTree.fromstring(container_data)
            opf_path = root.find('.//{urn:oasis:names:tc:opendocument:xmlns:container}rootfile').attrib['full-path']
            
            opf_data = z.read(opf_path)
            opf_root = ElementTree.fromstring(opf_data)
            
            ns = {
                'opf': 'http://www.idpf.org/2007/opf',
                'dc': 'http://purl.org/dc/elements/1.1/'
            }
            
            manifest = {}
            for item in opf_root.findall('.//opf:manifest/opf:item', ns):
                manifest[item.attrib['id']] = item.attrib['href']
                
            base_dir = os.path.dirname(opf_path)
            
            # Parse NCX to map filenames to titles
            ncx_map = {}
            ncx_href = None
            for item in opf_root.findall('.//opf:manifest/opf:item', ns):
                if item.attrib.get('media-type') == 'application/x-dtbncx+xml' or item.attrib['href'].endswith('.ncx'):
                    ncx_href = item.attrib['href']
                    break
                    
            if ncx_href:
                try:
                    ncx_full_path = os.path.join(base_dir, ncx_href).replace('\\', '/') if base_dir else ncx_href
                    ncx_data = z.read(ncx_full_path)
                    ncx_root = ElementTree.fromstring(ncx_data)
                    ncx_ns = {'ncx': 'http://www.daisy.org/z3986/2005/ncx/'}
                    
                    for navpoint in ncx_root.findall('.//ncx:navPoint', ncx_ns):
                        nav_label = navpoint.find('.//ncx:navLabel/ncx:text', ncx_ns)
                        content_el = navpoint.find('.//ncx:content', ncx_ns)
                        if nav_label is not None and content_el is not None:
                            label_text = nav_label.text.strip()
                            src_href = content_el.attrib.get('src', '')
                            clean_src = src_href.split('#')[0]
                            basename_key = os.path.basename(clean_src)
                            if label_text and basename_key:
                                if basename_key not in ncx_map:
                                    ncx_map[basename_key] = label_text
                except Exception as e:
                    print(f"      Warning parsing NCX file: {e}")

            chapters = []
            spine_itemrefs = opf_root.findall('.//opf:spine/opf:itemref', ns)
            
            valid_hrefs = []
            for itemref in spine_itemrefs:
                idref = itemref.attrib['idref']
                href = manifest.get(idref)
                if href:
                    full_href = os.path.join(base_dir, href).replace('\\', '/') if base_dir else href
                    clean_href = full_href.split('#')[0]
                    if clean_href not in valid_hrefs:
                        valid_hrefs.append(clean_href)
            
            chapter_idx = 1
            for idx, clean_href in enumerate(valid_hrefs):
                try:
                    html_content = z.read(clean_href).decode('utf-8', errors='ignore')
                    text = clean_html(html_content)
                    
                    if len(text) < 15:
                        continue
                    
                    is_first = (chapter_idx == 1)
                    is_last = (idx == len(valid_hrefs) - 1)
                    text = clean_gutenberg_noise(text, is_first, is_last)
                    
                    # 1. Start with NCX title if available
                    basename_key = os.path.basename(clean_href)
                    title = ncx_map.get(basename_key, "")
                    
                    # 2. Check headings in HTML
                    h1_match = re.search(r'<h1.*?>(.*?)</h1>', html_content, re.IGNORECASE | re.DOTALL)
                    h2_match = re.search(r'<h2.*?>(.*?)</h2>', html_content, re.IGNORECASE | re.DOTALL)
                    
                    # If we don't have a title or it's generic, try headings
                    if not title or is_generic_title(title, book_title):
                        if h2_match:
                            clean_h2 = clean_html(h2_match.group(1)).strip()
                            if clean_h2 and not is_generic_title(clean_h2, book_title) and len(clean_h2) < 100:
                                title = clean_h2
                        elif h1_match:
                            clean_h1 = clean_html(h1_match.group(1)).strip()
                            if clean_h1 and not is_generic_title(clean_h1, book_title) and len(clean_h1) < 100:
                                title = clean_h1
                                
                    # 3. Fallback
                    if not title or is_generic_title(title, book_title):
                        if chapter_idx == 1:
                            title = "Title Page"
                        else:
                            title = f"Chapter {chapter_idx}"
                    
                    text = clean_duplicate_headings(text, title)
                    text = format_paragraphs(text)
                    
                    if len(text) < 10:
                        continue
                        
                    if "title" in title.lower() and len(title) < 15:
                        title = "Title Page"
                    elif "contents" in title.lower() and len(title) < 15:
                        title = "Table of Contents"
                    elif "preface" in title.lower() and len(title) < 15:
                        title = "Preface"
                    elif "introduction" in title.lower() and len(title) < 20:
                        title = "Introduction"
                        
                    chapters.append({
                        "title": title,
                        "content": text
                    })
                    chapter_idx += 1
                except Exception as e:
                    print(f"      Error reading chapter file {clean_href}: {e}")
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
                    pass
                    
            pages = doc.get("number_of_pages_median", 280)
            rating = doc.get("ratings_average", 4.5)
            subjects = doc.get("subject", [])[:10]
            
            return {
                "cover": cover_url,
                "synopsis": description or doc.get("first_sentence", [""])[0],
                "pages": pages,
                "rating": round(rating, 2),
                "tags": subjects,
                "publisher": doc.get("publisher", ["Public Domain Classics"])[0]
            }
    except Exception as e:
        print(f"    Open Library metadata failed: {e}")
    return {}

gradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
]

def main():
    print("Starting BookFlix Seeder and Polishing Expansion...")
    os.makedirs('temp_epubs', exist_ok=True)
    
    server_data_dir = 'server_data'
    os.makedirs(server_data_dir, exist_ok=True)
    
    local_books_path = os.path.join(server_data_dir, 'books.json')
    local_contents_path = os.path.join(server_data_dir, 'book_contents.json')
    
    # Load existing books metadata if exists
    existing_books_map = {}
    if os.path.exists(local_books_path):
        try:
            with open(local_books_path, 'r', encoding='utf-8') as f:
                existing_list = json.load(f)
                for eb in existing_list:
                    existing_books_map[eb["id"]] = eb
            print(f"Loaded {len(existing_books_map)} existing books from local books.json.")
        except Exception as e:
            print(f"Failed to load existing books metadata: {e}")
            
    local_books = []
    local_contents = {}
    
    for idx, binfo in enumerate(books_to_process):
        b_id = binfo["id"]
        title = binfo["title"]
        author = binfo["author"]
        genres = binfo["genres"]
        
        print(f"\nProcessing Book {idx + 1}/20: {title} (ID: {b_id})")
        
        # Download EPUB from Project Gutenberg
        epub_filename = f"temp_epubs/{b_id}.epub"
        download_failed = False
        
        if not os.path.exists(epub_filename):
            url = f"https://www.gutenberg.org/ebooks/{b_id}.epub.noimages"
            print(f"    Downloading {url}...")
            try:
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
            chapters = extract_epub_contents(epub_filename, book_title=title)
            if not chapters:
                download_failed = True
                
        # Fetch / Reuse Metadata
        book_metadata = None
        if b_id in existing_books_map:
            print("    Reusing existing metadata from books.json.")
            book_metadata = existing_books_map[b_id]
            book_metadata["premium"] = False
            # Ensure correct chapter count in metadata
            book_metadata["chapters"] = len(chapters)
        else:
            meta = fetch_openlibrary_metadata(title, author)
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
                "premium": False,
                "featured": idx < 4,
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
    print("\nWriting all 20 polished books to local database files...")
    with open(local_books_path, 'w', encoding='utf-8') as f:
        json.dump(local_books, f, indent=2)
    with open(local_contents_path, 'w', encoding='utf-8') as f:
        json.dump(local_contents, f, indent=2)
    print("Local database updated successfully!")
    
    # Try uploading to live server
    live_url = "https://bookflix-production.up.railway.app"
    print(f"\nUploading all 20 polished books to live production server: {live_url}...")
    try:
        # Login
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
            print("  Login success. Uploading...")
            for i, b_meta in enumerate(local_books):
                b_id = b_meta["id"]
                b_cont = local_contents[str(b_id)]
                print(f"  Uploading {b_meta['title']} ({i+1}/20)...")
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
                    
                    with urllib.request.urlopen(upload_req, timeout=30) as upload_resp:
                        if upload_resp.status in (200, 201):
                            print(f"    Uploaded successfully.")
                        else:
                            print(f"    Failed status: {upload_resp.status}")
                except Exception as e:
                    print(f"    Error uploading: {e}")
        else:
            print("  Login failed: token not in response.")
    except Exception as e:
        print(f"  Live server login/upload failed: {e}")

if __name__ == '__main__':
    main()
