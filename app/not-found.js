import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page">
      <div className="loginCard">
        <div className="userIcon">⚠️</div>

        <h1>404 - Page Not Found</h1>

        <p>
          The page you are trying to access does not exist or the URL has been
          modified.
        </p>

        <Link href="/">
          <button className="primaryBtn">Back to Login</button>
        </Link>
      </div>
    </main>
  );
}