import { useParams, useNavigate } from 'react-router-dom';
import { useBook } from '../context/BookContext';
import PanelReader from '../components/PanelReader';
import TextReader from '../components/TextReader';

export default function ReaderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getBookById } = useBook();
  const book = getBookById(id);

  if (!book) {
    return (
      <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h3>Book Not Found</h3>
          <button className="btn btn-primary" onClick={() => navigate('/')} style={{ marginTop: '16px' }}>Go Home</button>
        </div>
      </div>
    );
  }

  // Route to the correct reader based on contentFormat
  if (book.contentFormat === 'panels') {
    return <PanelReader book={book} />;
  }

  return <TextReader book={book} />;
}
