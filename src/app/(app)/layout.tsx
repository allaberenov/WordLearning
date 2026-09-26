import { AppShell } from "@/components/layout/app-shell";
import { isAdminEmail } from "@/lib/admin";
import { requireUser } from "@/lib/auth";
import { countIncomingTeacherRequests } from "@/lib/teacher";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const pendingTeacherRequestCount = await countIncomingTeacherRequests(user.id);
  return (
    <AppShell
      user={{
        email: user.email,
        name: user.name,
        isAdmin: isAdminEmail(user.email),
        pendingTeacherRequestCount
      }}
    >
      {children}
    </AppShell>
  );
}
