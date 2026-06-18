import { Link } from 'react-router-dom';
import { FaTwitter, FaInstagram, FaFacebook, FaYoutube } from 'react-icons/fa';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="navbar-logo">BookFlix</div>
            <p>Your ultimate destination for books, manga, comics, and light novels. Stream unlimited reading content with a premium experience.</p>
          </div>
          <div className="footer-col">
            <h4>Browse</h4>
            <Link to="/browse?genre=Fantasy">Fantasy</Link>
            <Link to="/browse?genre=Romance">Romance</Link>
            <Link to="/browse?genre=Sci-Fi">Sci-Fi</Link>
            <Link to="/browse?genre=Mystery">Mystery</Link>
            <Link to="/browse?type=Manga">Manga</Link>
            <Link to="/browse?type=Manhwa">Manhwa</Link>
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            <Link to="/about">About Us</Link>
            <Link to="/careers">Careers</Link>
            <Link to="/blog">Blog</Link>
            <Link to="/contact">Contact</Link>
          </div>
          <div className="footer-col">
            <h4>Support</h4>
            <Link to="/help">Help Center</Link>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/cookies">Cookie Preferences</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 BookFlix. All rights reserved.</span>
          <div className="footer-social">
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"><FaTwitter /></a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"><FaInstagram /></a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer"><FaFacebook /></a>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer"><FaYoutube /></a>
          </div>
        </div>
      </div>
    </footer>
  );
}
