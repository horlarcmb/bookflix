// AI Recommendation Engine — Mock simulation
// Implements collaborative filtering, content-based, and hybrid recommendations

import { books as staticBooks } from './books';

export const catalogContainer = { books: staticBooks };

// Dynamic user preferences resolution
function getUserPreferences() {
  const currentUserStr = localStorage.getItem('bookflix_currentUser');
  if (currentUserStr) {
    try {
      const user = JSON.parse(currentUserStr);
      return {
        favoriteGenres: user.favoriteGenres || [],
        readBooks: Object.keys(user.readHistory || {}).map(id => parseInt(id)),
        ratings: user.ratings || {},
      };
    } catch (e) {
      console.error('Failed to parse current user for recommendations', e);
    }
  }
  return {
    favoriteGenres: ['Fantasy', 'Manga', 'Sci-Fi'],
    readBooks: [1, 2, 4, 5, 12, 14],
    ratings: { 1: 5, 2: 5, 4: 4, 5: 5, 12: 5, 14: 4 },
  };
}

// Content-based: Recommend books similar to what user has read
export function getContentBasedRecommendations(bookId, limit = 10) {
  const book = catalogContainer.books.find(b => b.id === bookId);
  if (!book) return [];

  return catalogContainer.books
    .filter(b => b.id !== bookId)
    .map(b => {
      let score = 0;
      // Genre overlap
      const genreOverlap = b.genre.filter(g => book.genre.includes(g)).length;
      score += genreOverlap * 3;
      // Tag overlap
      const tagOverlap = b.tags.filter(t => book.tags.includes(t)).length;
      score += tagOverlap * 2;
      // Same type bonus
      if (b.type === book.type) score += 2;
      // Same language bonus
      if (b.language === book.language) score += 1;
      // Rating similarity
      score += (1 - Math.abs(b.rating - book.rating)) * 2;
      return { ...b, relevanceScore: score };
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);
}

// Collaborative filtering: "Users who read this also liked..."
export function getCollaborativeRecommendations(bookId, limit = 10) {
  const book = catalogContainer.books.find(b => b.id === bookId);
  if (!book) return [];

  // Simulate by finding books with overlapping genre + high read count
  return catalogContainer.books
    .filter(b => b.id !== bookId)
    .map(b => {
      let score = 0;
      const hasGenreOverlap = b.genre.some(g => book.genre.includes(g));
      if (hasGenreOverlap) score += 5;
      score += Math.log10(b.readCount) * 0.5;
      score += b.rating * 0.5;
      // Random variation to simulate real collaborative filtering
      score += (b.id * 7 + bookId * 13) % 3;
      return { ...b, collaborativeScore: score };
    })
    .sort((a, b) => b.collaborativeScore - a.collaborativeScore)
    .slice(0, limit);
}

// Hybrid recommendations
export function getHybridRecommendations(bookId, limit = 10) {
  const contentBased = getContentBasedRecommendations(bookId, 20);
  const collaborative = getCollaborativeRecommendations(bookId, 20);

  const scoreMap = new Map();

  contentBased.forEach((b, i) => {
    scoreMap.set(b.id, { book: b, score: (20 - i) * 0.6 });
  });

  collaborative.forEach((b, i) => {
    const existing = scoreMap.get(b.id);
    if (existing) {
      existing.score += (20 - i) * 0.4;
    } else {
      scoreMap.set(b.id, { book: b, score: (20 - i) * 0.4 });
    }
  });

  return Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.book);
}

// Personalized "For You" recommendations
export function getPersonalizedRecommendations(limit = 15) {
  const { favoriteGenres, readBooks } = getUserPreferences();

  return catalogContainer.books
    .filter(b => !readBooks.includes(b.id))
    .map(b => {
      let score = 0;
      const genreMatch = b.genre.filter(g => favoriteGenres.includes(g)).length;
      score += genreMatch * 4;
      score += b.rating * 2;
      score += Math.log10(b.readCount);
      return { ...b, personalScore: score };
    })
    .sort((a, b) => b.personalScore - a.personalScore)
    .slice(0, limit);
}

// "Because you like [Genre]" recommendations
export function getBecauseYouLike(genre, limit = 10) {
  return catalogContainer.books
    .filter(b => b.genre.includes(genre))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit);
}

// AI classification simulation
export function classifyBook(book) {
  const classifications = {
    readingLevel: book.type === 'Textbook' ? 'Advanced' : book.type === 'Light Novel' ? 'Casual' : 'Intermediate',
    ageRating: book.genre.includes('Horror') ? '16+' : book.genre.includes('Romance') ? '13+' : 'All Ages',
    mood: book.genre.includes('Romance') ? 'Heartwarming' :
          book.genre.includes('Horror') ? 'Thrilling' :
          book.genre.includes('Comedy') || book.tags?.includes('Comedy') ? 'Fun' :
          book.genre.includes('Adventure') ? 'Exciting' : 'Engaging',
    pacing: book.chapters > 100 ? 'Epic (Slow Burn)' : book.chapters > 30 ? 'Steady' : 'Fast-Paced',
  };
  return classifications;
}

// Why you'll love this
export function getWhyYoullLove(book) {
  const reasons = [];
  const { favoriteGenres } = getUserPreferences();

  if (book.genre.some(g => favoriteGenres.includes(g))) {
    const matchedGenre = book.genre.find(g => favoriteGenres.includes(g));
    reasons.push(`Matches your love for ${matchedGenre}`);
  }
  if (book.rating >= 4.5) reasons.push('Critically acclaimed with stellar ratings');
  if (book.readCount > 2000000) reasons.push('Loved by millions of readers worldwide');
  if (book.status === 'Completed') reasons.push('Complete series — binge-read without waiting');
  if (book.status === 'Ongoing') reasons.push('Ongoing — new chapters regularly');
  if (book.tags?.includes('Award Winner')) reasons.push('Award-winning masterpiece');

  if (reasons.length === 0) {
    reasons.push('Trending in your favorite categories');
    reasons.push('Highly rated by similar readers');
  }

  return reasons;
}
