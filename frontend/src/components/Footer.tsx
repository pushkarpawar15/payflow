export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <b>Contact</b>
          <p>email : payflow@example.com</p>
          <p>number : 1233214567</p>
        </div>
        <div className="footer-bottom">
          <small>&copy; {new Date().getFullYear()} PayFlow. Simulated payment environment.</small>
        </div>
      </div>
    </footer>
  )
}