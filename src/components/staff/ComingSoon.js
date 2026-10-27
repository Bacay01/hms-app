export default function ComingSoon({ title, phase }) {
  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8">
        <p className="text-sm text-white/70">
          This module is coming in <span className="font-semibold text-white">{phase}</span> of the build.
        </p>
        <p className="mt-1 text-xs text-white/45">
          You can see this page because your role has access to it.
        </p>
      </div>
    </div>
  );
}
