export default function AppPageIntro({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-2xl font-semibold tracking-tight text-slate-900">
        {title}
      </p>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
    </div>
  );
}
