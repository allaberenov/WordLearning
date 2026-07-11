import { AuthForm } from "@/components/auth/auth-form";

export default function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ expired?: string }>;
}) {
  void searchParams;
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <AuthForm mode="login" />
    </main>
  );
}
