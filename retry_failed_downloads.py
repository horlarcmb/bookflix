import urllib.request
import urllib.parse
import json
import os
import re
import random
import zipfile
import time
from xml.etree import ElementTree

# 25 new books mapping to the Gutenberg categories
books_info = {
    2131: {"title": "The History of Herodotus", "author": "Herodotus", "genres": ["History", "Historical"]},
    731: {"title": "The Decline and Fall of the Roman Empire", "author": "Edward Gibbon", "genres": ["History", "Historical"]},
    7142: {"title": "The History of the Peloponnesian War", "author": "Thucydides", "genres": ["History", "Historical"]},
    3327: {"title": "The French Revolution", "author": "Thomas Carlyle", "genres": ["History", "Historical"]},
    5344: {"title": "Life of Abraham Lincoln", "author": "John Hugh Bowers", "genres": ["History", "Historical"]},
    
    1228: {"title": "On the Origin of Species", "author": "Charles Darwin", "genres": ["Science & Technology", "Non-Fiction"]},
    30155: {"title": "Relativity: The Special and General Theory", "author": "Albert Einstein", "genres": ["Science & Technology", "Non-Fiction"]},
    5000: {"title": "The Notebooks of Leonardo Da Vinci", "author": "Leonardo da Vinci", "genres": ["Science & Technology", "Arts & Culture", "Non-Fiction"]},
    14986: {"title": "Experimental Researches in Electricity", "author": "Michael Faraday", "genres": ["Science & Technology", "Non-Fiction"]},
    9403: {"title": "The Voyage of the Beagle", "author": "Charles Darwin", "genres": ["Science & Technology", "Non-Fiction", "Adventure"]},
    
    1672: {"title": "The Republic", "author": "Plato", "genres": ["Social Sciences", "Religion & Philosophy"]},
    1232: {"title": "The Prince", "author": "Niccolò Machiavelli", "genres": ["Social Sciences", "Religion & Philosophy", "History"]},
    3300: {"title": "The Wealth of Nations", "author": "Adam Smith", "genres": ["Social Sciences", "Non-Fiction"]},
    815: {"title": "Democracy in America", "author": "Alexis de Tocqueville", "genres": ["Social Sciences", "History", "Non-Fiction"]},
    23202: {"title": "Utopia", "author": "Thomas More", "genres": ["Social Sciences", "Religion & Philosophy", "Fiction"]},
    
    14264: {"title": "The Practice and Science of Drawing", "author": "Harold Speed", "genres": ["Arts & Culture", "Non-Fiction"]},
    26543: {"title": "A Complete History of Music", "author": "W. J. Baltzell", "genres": ["Arts & Culture", "History", "Non-Fiction"]},
    35898: {"title": "The Seven Lamps of Architecture", "author": "John Ruskin", "genres": ["Arts & Culture", "Non-Fiction"]},
    41249: {"title": "Shakespeare and Music", "author": "Edward W. Naylor", "genres": ["Arts & Culture", "Literature"]},
    16828: {"title": "Ancient Pagan and Modern Christian Symbolism", "author": "Thomas Inman", "genres": ["Arts & Culture", "Religion & Philosophy", "Non-Fiction"]},
    
    4363: {"title": "Beyond Good and Evil", "author": "Friedrich Nietzsche", "genres": ["Religion & Philosophy", "Non-Fiction"]},
    5827: {"title": "The Problems of Philosophy", "author": "Bertrand Russell", "genres": ["Religion & Philosophy", "Non-Fiction"]},
    2680: {"title": "Meditations", "author": "Marcus Aurelius", "genres": ["Religion & Philosophy", "History"]},
    1998: {"title": "Thus Spake Zarathustra", "author": "Friedrich Nietzsche", "genres": ["Religion & Philosophy", "Fiction"]},
    4280: {"title": "The Critique of Pure Reason", "author": "Immanuel Kant", "genres": ["Religion & Philosophy", "Non-Fiction"]}
}

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
    
    if any(k in title_str.lower() for k in ["preface", "introduction", "dedication", "foreword", "prologue", "contents", "illustration"]):
        return False
        
    if b_clean and t_clean == b_clean:
        return True
    if "projectgutenberg" in t_clean or "gutenbergebook" in t_clean:
        return True
    return False

def extract_epub_contents(zip_path, book_title=None):
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
            
            # Parse NCX
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
                    pass

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
                    
                    basename_key = os.path.basename(clean_href)
                    title = ncx_map.get(basename_key, "")
                    
                    h1_match = re.search(r'<h1.*?>(.*?)</h1>', html_content, re.IGNORECASE | re.DOTALL)
                    h2_match = re.search(r'<h2.*?>(.*?)</h2>', html_content, re.IGNORECASE | re.DOTALL)
                    
                    if not title or is_generic_title(title, book_title):
                        if h2_match:
                            clean_h2 = clean_html(h2_match.group(1)).strip()
                            if clean_h2 and not is_generic_title(clean_h2, book_title) and len(clean_h2) < 100:
                                title = clean_h2
                        elif h1_match:
                            clean_h1 = clean_html(h1_match.group(1)).strip()
                            if clean_h1 and not is_generic_title(clean_h1, book_title) and len(clean_h1) < 100:
                                title = clean_h1
                                
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
                    pass
            return chapters
    except Exception as e:
        pass
    return []

def main():
    print("Starting robust download retry for failed books...")
    os.makedirs('temp_epubs', exist_ok=True)
    
    server_data_dir = 'server_data'
    local_books_path = os.path.join(server_data_dir, 'books.json')
    local_contents_path = os.path.join(server_data_dir, 'book_contents.json')
    
    # Load current catalog
    if not os.path.exists(local_books_path) or not os.path.exists(local_contents_path):
        print("Database files do not exist.")
        return
        
    with open(local_books_path, 'r', encoding='utf-8') as f:
        books_list = json.load(f)
    with open(local_contents_path, 'r', encoding='utf-8') as f:
        contents_map = json.load(f)
        
    failed_ids = []
    for book in books_list:
        bid = book["id"]
        # Check if the book belongs to Gutenberg list and has 0 chapters or status 'Unavailable'
        if bid in books_info:
            content = contents_map.get(str(bid))
            if not content or len(content.get("chapters", [])) == 0 or book.get("status") == "Unavailable":
                failed_ids.append(bid)
                
    print(f"Identified {len(failed_ids)} failed/empty books to redownload: {failed_ids}")
    
    headers_list = [
        {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'},
        {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'},
        {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0'}
    ]
    
    for idx, bid in enumerate(failed_ids):
        binfo = books_info[bid]
        title = binfo["title"]
        epub_filename = f"temp_epubs/{bid}.epub"
        
        print(f"\nRetrying {title} (ID: {bid}) [{idx+1}/{len(failed_ids)}]")
        
        # Download loop with retries and delay
        success = False
        for attempt in range(1, 4):
            # Clean up existing failed file to download fresh
            if os.path.exists(epub_filename):
                try:
                    os.remove(epub_filename)
                except:
                    pass
                    
            url = f"https://www.gutenberg.org/ebooks/{bid}.epub.noimages"
            print(f"  Attempt {attempt}: Downloading from {url}...")
            
            try:
                # Add delay between downloads
                time.sleep(3.0)
                
                req = urllib.request.Request(url, headers=random.choice(headers_list))
                with urllib.request.urlopen(req, timeout=30) as response:
                    # Write to file
                    with open(epub_filename, 'wb') as out_file:
                        # Stream the download to avoid incomplete reads
                        while True:
                            chunk = response.read(16384)
                            if not chunk:
                                break
                            out_file.write(chunk)
                            
                # Verify zip integrity
                if zipfile.is_zipfile(epub_filename):
                    print("  Download complete and verified zip.")
                    success = True
                    break
                else:
                    print("  Download finished but file is not a valid zip EPUB.")
            except Exception as e:
                print(f"  Attempt {attempt} failed: {e}")
                
        if not success:
            print(f"  Failed all attempts for {title}. Skipping...")
            continue
            
        # Parse EPUB
        print(f"  Parsing EPUB content...")
        chapters = extract_epub_contents(epub_filename, book_title=title)
        
        if not chapters:
            print(f"  Warning: No chapters extracted from {title}.")
            continue
            
        print(f"  Successfully extracted {len(chapters)} chapters.")
        
        # Update state
        for book in books_list:
            if book["id"] == bid:
                book["chapters"] = len(chapters)
                book["status"] = "Completed"
                
        contents_map[str(bid)] = {
            "bookId": bid,
            "chapters": chapters,
            "pages": []
        }
        
        # Save after each successful download to prevent losing progress
        with open(local_books_path, 'w', encoding='utf-8') as f:
            json.dump(books_list, f, indent=2)
        with open(local_contents_path, 'w', encoding='utf-8') as f:
            json.dump(contents_map, f, indent=2)
            
    print("\nRobust retry cycle completed!")

if __name__ == '__main__':
    main()
