import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import BookCard from './BookCard';

export default function ContentRow({ title, icon, books, seeAllLink }) {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const amount = direction === 'left' ? -600 : 600;
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  if (!books || books.length === 0) return null;

  return (
    <section className="content-section">
      <div className="content-section-header">
        <h2 className="content-section-title">
          {icon && <span className="icon">{icon}</span>}
          {title}
        </h2>
        {seeAllLink && <Link to={seeAllLink} className="see-all-link">See All →</Link>}
      </div>
      <div className="content-row-wrapper">
        <button className="content-row-arrow left" onClick={() => scroll('left')}>
          <FiChevronLeft />
        </button>
        <div className="content-row" ref={scrollRef}>
          {books.map(book => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
        <button className="content-row-arrow right" onClick={() => scroll('right')}>
          <FiChevronRight />
        </button>
      </div>
    </section>
  );
}
