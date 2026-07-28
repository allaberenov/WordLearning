import { AppShell } from "@/components/layout/app-shell";
import { isAdminEmail } from "@/lib/admin";
import { requireUser } from "@/lib/auth";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <AppShell user={{ email: user.email, name: user.name, isAdmin: isAdminEmail(user.email) }}>
      {children}
    </AppShell>
  );
}
