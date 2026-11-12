import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="eyebrow">Not found</p>
      <h1 className="mt-2 text-3xl">We couldn't find that page</h1>
      <Link href="/" className="link mt-4">Go home</Link>
    </div>
  );
}
