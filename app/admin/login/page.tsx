import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = {
  title: "Sign In — Admin",
  robots: { index: false, follow: false },
};

interface AdminLoginPageProps {
  searchParams: Promise<{ next?: string }>;
}

/**
 * Middleware already redirects an already-authenticated visit here
 * straight to /admin (or `next`) before this ever renders — see
 * lib/supabase/middleware.ts — so this page only needs to handle the
 * actual sign-in form, not repeat that check.
 */
export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <LoginForm next={next} />
    </div>
  );
}
