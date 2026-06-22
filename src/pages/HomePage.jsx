import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaFire, FaStar } from 'react-icons/fa';
import { FiClock, FiBookOpen, FiLayers, FiAward, FiStar, FiCompass, FiGrid } from 'react-icons/fi';
import HeroBanner from '../components/HeroBanner';
import ContentRow from '../components/ContentRow';
import { useBook } from '../context/BookContext';
import { useAuth } from '../context/AuthContext';
import { 
  getPersonalizedRecommendations, 
  getBecauseYouLike 
} from '../data/recommendations';

export default function HomePage() {
  const { user } = useAuth();
  const {
    catalog: books,
    getTrendingBooks,
    getNewReleases,
    getTopManga,
    getTopRated,
    getFeaturedBooks
  } = useBook();

  if (!user) {
    return (
      <div className="landing-container">
        <div className="landing-overlay" />
        <motion.div 
          className="landing-content"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="landing-title">Book<span>Flix</span></h1>
          <p className="landing-desc">
            Stream unlimited novels, manga, manhwa, research papers, and textbooks. 
            Anytime, anywhere, on any device.
          </p>
          <div className="landing-buttons">
            <Link to="/login" className="btn btn-primary btn-lg landing-btn">
              Log In
            </Link>
            <Link to="/signup" className="btn btn-outline btn-lg landing-btn">
              Create Account
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const personalRecs = getPersonalizedRecommendations();
  const fantasyRecs = getBecauseYouLike('Fantasy');
  const scifiRecs = getBecauseYouLike('Sci-Fi');

  // New categories including Textbook, Research, School, and AI-Generated
  const genreCards = [
    { name: 'Fantasy', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { name: 'Sci-Fi', gradient: 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)' },
    { name: 'Romance', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
    { name: 'Mystery', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
    { name: 'Horror', gradient: 'linear-gradient(135deg, #2d1b69 0%, #e50914 100%)' },
    { name: 'Manga', gradient: 'linear-gradient(135deg, #ff6b6b 0%, #ffa07a 100%)' },
    { name: 'Manhwa', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
    { name: 'Light Novel', gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' },
    { name: 'Textbook', gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
    { name: 'Research', gradient: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)' },
    { name: 'School', gradient: 'linear-gradient(135deg, #8e44ad 0%, #9b59b6 100%)' },
    { name: 'AI-Generated', gradient: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' }
  ];

  const featured = getFeaturedBooks().slice(0, 5);
  const hasFeatured = featured.length > 0;

  return (
    <div className={!hasFeatured ? "page-content" : ""}>
      {books.length === 0 ? (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-2xl) var(--space-md)', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: '4rem', marginBottom: 'var(--space-md)' }}>📚</div>
          <h2 style={{ fontSize: '2rem', marginBottom: 'var(--space-md)', fontWeight: 700 }}>Welcome to BookFlix</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', marginBottom: 'var(--space-xl)', lineHeight: '1.6' }}>
            No books or manga have been uploaded to the catalog yet. Get started by logging into the Admin Panel to publish your first content!
          </p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link to="/admin" className="btn btn-primary" style={{ padding: '12px 24px' }}>Go to Admin Dashboard</Link>
            <Link to="/browse" className="btn btn-outline" style={{ padding: '12px 24px' }}>Browse Categories</Link>
          </div>
        </div>
      ) : (
        <>
          <HeroBanner />
          
          <div className="homepage-rows" style={{ marginTop: !hasFeatured ? '0px' : undefined }}>
            {/* Dynamic contents */}
            <ContentRow title="Trending Now" icon={<FaFire />} books={getTrendingBooks()} seeAllLink="/browse?sort=trending" />
            <ContentRow title="Continue Reading" icon={<FiClock />} books={books.slice(0, 5)} />
            <ContentRow title="Recommended for You" icon={<FaStar />} books={personalRecs} seeAllLink="/browse" />
            <ContentRow title="New Releases" icon={<FiBookOpen />} books={getNewReleases()} seeAllLink="/browse?sort=newest" />
            <ContentRow title="Top Manga & Manhwa" icon={<FiLayers />} books={getTopManga()} seeAllLink="/browse?type=Manga" />
            
            {/* Category based */}
            <ContentRow title="Because You Like Fantasy" icon={<FiAward />} books={fantasyRecs} />
            <ContentRow title="Highest Rated" icon={<FiStar />} books={getTopRated()} seeAllLink="/browse?sort=rating" />
            <ContentRow title="Because You Like Sci-Fi" icon={<FiCompass />} books={scifiRecs} />
          </div>
        </>
      )}

      {/* Genre Grid */}
      <section className="content-section" style={{ paddingBottom: 'var(--space-2xl)' }}>
        <div className="content-section-header">
          <h2 className="content-section-title"><FiGrid /> Browse by Category</h2>
        </div>
        <div className="container">
          <div className="genre-grid">
            {genreCards.map((genre) => {
              // Get count based on type or genre matching
              const count = books.filter(b => 
                b.genre.includes(genre.name) || 
                b.type === genre.name || 
                (genre.name === 'AI-Generated' && b.isAIGenerated) ||
                (genre.name === 'School' && b.type === 'School Book')
              ).length;
              
              const linkUrl = genre.name === 'AI-Generated' 
                ? '/browse?genre=AI-Generated' 
                : `/browse?genre=${genre.name}`;

              return (
                <Link to={linkUrl} key={genre.name}>
                  <motion.div
                    className="genre-card"
                    whileHover={{ y: -4, scale: 1.02 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <div className="genre-card-bg" style={{ background: genre.gradient }} />
                    <div className="genre-card-content">
                      <div className="genre-card-title">{genre.name}</div>
                      <div className="genre-card-count">{count} titles</div>
                    </div>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
