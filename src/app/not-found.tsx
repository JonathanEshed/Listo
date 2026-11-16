import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="wrap grid min-h-[60dvh] content-center justify-items-start gap-4">
      <h1 className="h1">הדף לא נמצא</h1>
      <p className="muted">ייתכן שהנכס הוסר מהמאגר, או שאין לך גישה אליו.</p>
      <Link href="/" className="btn-primary">לדף הבית</Link>
    </main>
  );
}
