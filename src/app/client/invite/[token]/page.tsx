export default async function ClientInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <div className="space-y-3">
      <h2 className="text-2xl font-semibold">Invitation</h2>
      <p className="text-slate-300">
        Token: <span className="font-mono text-slate-200">{token}</span>
      </p>
      <p className="text-sm text-slate-400">Validation later.</p>
    </div>
  );
}
