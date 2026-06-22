import urllib.request
import json
import os
import re
import random
from xml.etree import ElementTree
import zipfile

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
    html = re.sub(r'<(script|style).*?>.*?</\1>', '', html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<[^>]*>', '', html)
    text = text.replace('&nbsp;', ' ').replace('&lt;', '<').replace('&gt;', '>').replace('&amp;', '&').replace('&quot;', '"').replace('&apos;', "'")
    text = re.sub(r'\r\n', '\n', text)
    return text.strip()

def clean_gutenberg_noise(text, is_first=False, is_last=False):
    # Remove Gutenberg start markers
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

    # Remove Gutenberg end markers (boilerplate license at end of book)
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
    # Split paragraphs by double newline (or multiple newlines)
    paragraphs = re.split(r'\n\s*\n', text)
    cleaned_paragraphs = []
    
    for p in paragraphs:
        # Merge single newlines inside paragraph with a space
        cleaned_p = re.sub(r'(?<!\n)\n(?!\n)', ' ', p)
        # Normalize multiple spaces/tabs
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
    
    for i in range(min(6, len(lines))):
        line = lines[i].strip()
        clean_line = re.sub(r'[^a-zA-Z0-9]', '', line).lower()
        
        # If it matches title, or is empty, or is just "CHAPTER I", "LETTER I", etc.
        if (clean_line == clean_title or 
            re.match(r'^chapter\s*[ivxl0-9\s]+$', clean_line) or 
            re.match(r'^letter\s*[ivxl0-9\s]+$', clean_line) or
            re.match(r'^volume\s*[ivxl0-9\s]+$', clean_line) or
            (len(line) < 50 and any(kw in line.upper() for kw in ["GUTENBERG", "PROLOGUE", "PREFACE", "EBOOK", "START OF"]))):
            lines[i] = ""
            
    # Reassemble and strip extra whitespace
    return "\n".join(lines).strip()

def extract_epub_contents(zip_path):
    print(f"    Extracting & polishing contents from {zip_path}...")
    try:
        with zipfile.ZipFile(zip_path, 'r') as z:
            # 1. Find container.xml
            container_data = z.read('META-INF/container.xml')
            root = ElementTree.fromstring(container_data)
            opf_path = root.find('.//{urn:oasis:names:tc:opendocument:xmlns:container}rootfile').attrib['full-path']
            
            # 2. Parse OPF file
            opf_data = z.read(opf_path)
            opf_root = ElementTree.fromstring(opf_data)
            
            ns = {
                'opf': 'http://www.idpf.org/2007/opf',
                'dc': 'http://purl.org/dc/elements/1.1/'
            }
            
            # 3. Read manifest items
            manifest = {}
            for item in opf_root.findall('.//opf:manifest/opf:item', ns):
                manifest[item.attrib['id']] = item.attrib['href']
                
            base_dir = os.path.dirname(opf_path)
            
            # 4. Read spine items in order
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
                    
                    # Ignore short pages like title page, table of contents
                    if len(text) < 150:
                        continue
                    
                    # Clean Gutenberg Noise
                    is_first = (chapter_idx == 1)
                    is_last = (idx == len(valid_hrefs) - 1)
                    text = clean_gutenberg_noise(text, is_first, is_last)
                    
                    # Resolve chapter title
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
                    
                    # Clean duplicate title from text
                    text = clean_duplicate_headings(text, title)
                    
                    # Reflow paragraphs correctly (merge internal line breaks)
                    text = format_paragraphs(text)
                    
                    if len(text) < 100:
                        continue
                        
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

def main():
    print("Starting BookFlix Book Content Polishing & Uploading...")
    
    server_data_dir = 'server_data'
    local_books_path = os.path.join(server_data_dir, 'books.json')
    local_contents_path = os.path.join(server_data_dir, 'book_contents.json')
    
    # Load metadata
    with open(local_books_path, 'r', encoding='utf-8') as f:
        local_books = json.load(f)
        
    local_contents = {}
    
    # Reprocess EPUB files for all books
    for b_meta in local_books:
        b_id = b_meta["id"]
        title = b_meta["title"]
        epub_filename = f"temp_epubs/{b_id}.epub"
        
        if os.path.exists(epub_filename):
            chapters = extract_epub_contents(epub_filename)
            b_meta["chapters"] = len(chapters)
            
            book_content = {
                "bookId": b_id,
                "chapters": chapters,
                "pages": []
            }
            local_contents[str(b_id)] = book_content
            print(f"    Successfully polished {title}: {len(chapters)} chapters.")
        else:
            print(f"    EPUB not found for {title}. Keeping draft placeholder.")
            # Create empty content
            local_contents[str(b_id)] = {
                "bookId": b_id,
                "chapters": [],
                "pages": []
            }

    # Save to local server files
    print("\nSaving polished databases locally...")
    with open(local_books_path, 'w', encoding='utf-8') as f:
        json.dump(local_books, f, indent=2)
    with open(local_contents_path, 'w', encoding='utf-8') as f:
        json.dump(local_contents, f, indent=2)
    print("Local database updated successfully!")
    
    # Upload polished chapters to live server
    live_url = "https://bookflix-production.up.railway.app"
    print(f"\nUploading polished contents to live production server: {live_url}...")
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
            print("  Login success. Uploading...")
            for i, b_meta in enumerate(local_books):
                b_id = b_meta["id"]
                b_cont = local_contents[str(b_id)]
                print(f"  Uploading polished {b_meta['title']} ({i+1}/10)...")
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
