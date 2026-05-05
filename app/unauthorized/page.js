import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="page">
      <div className="loginCard">
        <div className="userIcon">🔒</div>

        <h1>Unauthorized Access</h1>

        <p>
          Your session has expired or you are not authorized to access this
          page. Please login again.
        </p>

        <Link href="/">
          <button className="primaryBtn">Go to Login</button>
        </Link>
      </div>
    </main>
  );
}