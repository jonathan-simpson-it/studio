export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm px-4">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            Studio
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Jonathon Simpson &amp; Co.
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
