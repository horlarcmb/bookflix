// BookFlix — Clean Book Catalog Configuration

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

// Empty catalog - Admin will upload real content
export const books = [];

// Empty chapter content store
export const sampleChapterContent = {};

// Empty panel pages store
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
