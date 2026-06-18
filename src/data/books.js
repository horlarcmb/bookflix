// BookFlix — Clean Book Catalog Configuration with Public Domain Classics

export const GENRES = [
  'Fiction', 'Sci-Fi', 'Romance', 'Mystery', 'Horror', 'Self-Help',
  'Business', 'Fantasy', 'Adventure', 'Thriller', 'Drama', 'Historical',
  'Non-Fiction', 'Textbook', 'Research', 'School', 'Academic',
  'Manga', 'Manhwa', 'Light Novel', 'AI-Generated'
];

export const CONTENT_TYPES = [
  'Novel', 'Manga', 'Manhwa', 'Webtoon', 'Light Novel',
  'Textbook', 'Research', 'Guide', 'School Book', 'AI Novel'
];

export const LANGUAGES = ['English', 'Japanese', 'Korean', 'Chinese', 'Spanish', 'French', 'German'];

export const books = [
  {
    id: 101,
    title: "Alice's Adventures in Wonderland",
    author: "Lewis Carroll",
    cover: null,
    gradient: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
    genre: ["Fiction", "Fantasy", "Adventure"],
    type: "Novel",
    contentFormat: "text",
    rating: 4.8,
    synopsis: "Alice, a young girl, falls asleep on a riverbank and follows a white rabbit down a rabbit-hole. She enters a whimsical world populated by peculiar, anthropomorphic creatures.",
    chapters: 1,
    status: "Completed",
    language: "English",
    tags: ["Fantasy", "Classic", "Children", "Adventure"],
    readCount: 14200000,
    premium: false,
    featured: true,
    isAIGenerated: false,
    dateAdded: "2025-01-01",
    pages: 120,
    publisher: "Project Gutenberg"
  },
  {
    id: 102,
    title: "The Adventures of Sherlock Holmes",
    author: "Sir Arthur Conan Doyle",
    cover: null,
    gradient: "linear-gradient(135deg, #2d1b69 0%, #6b3fa0 100%)",
    genre: ["Mystery", "Thriller", "Fiction"],
    type: "Novel",
    contentFormat: "text",
    rating: 4.7,
    synopsis: "A collection of Sir Arthur Conan Doyle's most famous detective short stories featuring the brilliant Holmes and his loyal companion Dr. Watson.",
    chapters: 1,
    status: "Completed",
    language: "English",
    tags: ["Mystery", "Classic", "Detective", "Thriller"],
    readCount: 18500000,
    premium: false,
    featured: true,
    isAIGenerated: false,
    dateAdded: "2025-01-01",
    pages: 300,
    publisher: "Project Gutenberg"
  }
];

// Real text of the public domain books
export const sampleChapterContent = {
  101: {
    title: "Chapter 1: Down the Rabbit-Hole",
    content: `Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, "and what is the use of a book," thought Alice "without pictures or conversations?"

So she was considering in her own mind (as well as she could, for the hot day made her feel very sleepy and stupid), whether the pleasure of making a daisy-chain would be worth the trouble of getting up and picking the daisies, when suddenly a White Rabbit with pink eyes ran close by her.

There was nothing so very remarkable in that; nor did Alice think it so very much out of the way to hear the Rabbit say to itself, "Oh dear! Oh dear! I shall be late!" (when she thought it over afterwards, it occurred to her that she ought to have wondered at this, but at the time it all seemed quite natural); but when the Rabbit actually took a watch out of its waistcoat-pocket, and looked at it, and then hurried on, Alice started to her feet, for it flashed across her mind that she had never before seen a rabbit with either a waistcoat-pocket, or a watch to take out of it, and burning with curiosity, she ran across the field after it, and fortunately was just in time to see it pop down a large rabbit-hole under the hedge.

In another moment down went Alice after it, never once considering how in the world she was to get out again.

The rabbit-hole went straight on like a tunnel for some way, and then dipped suddenly down, so suddenly that Alice had not a moment to think about stopping herself before she found herself falling down a very deep well.`
  },
  102: {
    title: "A Scandal in Bohemia",
    content: `To Sherlock Holmes she is always the woman. I have seldom heard him mention her under any other name. In his eyes she eclipses and predominates the whole of her sex. It was not that he felt any emotion akin to love for Irene Adler. All emotions, and that one particularly, were abhorrent to his cold, precise but admirably balanced mind. He was, I take it, the most perfect reasoning and observing machine that the world has seen, but as a lover he would have placed himself in a false position. He never spoke of the softer passions, save with a gibe and a sneer. They were admirable things for the observer—excellent for drawing the veil from men's motives and actions. But for the trained reasoner to admit such intrusions into his own delicate and finely adjusted temperament was to introduce a distracting factor which might throw a doubt upon all his mental results.

Grit in a sensitive instrument, or a crack in one of his own high-power lenses, would not be more disturbing than a strong emotion in a nature such as his. And yet there was but one woman to him, and that woman was the late Irene Adler, of dubious and questionable memory.

I had seen little of Holmes lately. My marriage had drifted us away from each other. My own complete happiness, and the home-centred interests which rise up around the man who first finds himself master of his own establishment, were sufficient to absorb all my attention, while Holmes, who loathed every form of society with his whole Bohemian soul, remained in our lodgings in Baker Street, buried among his old books, and alternating from week to week between cocaine and ambition, the drowsiness of the drug, and the fierce energy of his own keen nature.`
  }
};

export const sampleMangaPanels = {
  default: []
};

// Helper functions for catalog queries
export const getBooksByGenre = (genre) => books.filter(b => b.genre.includes(genre));
export const getFeaturedBooks = () => books.filter(b => b.featured);
export const getTrendingBooks = () => [...books].sort((a, b) => b.readCount - a.readCount).slice(0, 15);
export const getNewReleases = () => [...books].sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded)).slice(0, 15);
export const getTopManga = () => books.filter(b => ['Manga', 'Manhwa'].includes(b.type)).sort((a, b) => b.readCount - a.readCount).slice(0, 15);
export const getTopRated = () => [...books].sort((a, b) => b.rating - a.rating).slice(0, 15);
export const getPremiumBooks = () => books.filter(b => b.premium);
export const getAIGeneratedBooks = () => books.filter(b => b.isAIGenerated);
export const getTextbooks = () => books.filter(b => ['Textbook', 'School Book', 'Research'].includes(b.type));
export const getLightNovels = () => books.filter(b => b.type === 'Light Novel');
export const getBookById = (id) => books.find(b => b.id === parseInt(id));
export const searchBooks = (query) => {
  const q = query.toLowerCase();
  return books.filter(b =>
    b.title.toLowerCase().includes(q) ||
    b.author.toLowerCase().includes(q) ||
    b.genre.some(g => g.toLowerCase().includes(q)) ||
    b.tags.some(t => t.toLowerCase().includes(q)) ||
    b.type.toLowerCase().includes(q)
  );
};
