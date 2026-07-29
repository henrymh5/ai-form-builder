export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background flex min-h-screen flex-1 items-center justify-center p-6">
      <div className="border-border bg-surface w-full max-w-sm rounded-lg border p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}
