import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

interface TvApp {
  id: string;
  slug: string;
  name: string;
  logo_url: string;
  short_description: string;
  audience_type: string;
  external?: boolean;
  external_url?: string;
  category: string;
}

interface TvLinkProps {
  app: TvApp;
}

/* eslint-disable @next/next/no-img-element */
export const InternalTvLink = ({ app }: TvLinkProps) => {
  return (
    <Link href={`/tv/${app.slug}`}>
      <div className="relative flex w-full cursor-pointer flex-row items-center rounded-md border p-5 text-center shadow-xs hover:bg-slate-50 md:h-40 md:w-40 md:max-w-40 md:flex-col md:justify-center md:p-0">
        {app.audience_type.length > 0 ? (
          <Badge
            variant="destructive"
            className="absolute top-1 right-1 rounded-full bg-slate-300 text-xs font-light text-gray-700 shadow-none hover:bg-slate-300"
          >
            {app.audience_type}
          </Badge>
        ) : null}
        <div className="flex items-center md:grow md:justify-center">
          <img
            src={app.logo_url}
            alt={app.name}
            className="h-16 w-16 object-contain md:h-24 md:w-24"
          />
        </div>
        <div className="flex flex-col items-start p-2 md:w-full md:items-center md:bg-slate-100">
          <span className="md:text-sm">{app.name}</span>
          <span className="text-xs text-slate-500 md:hidden">
            {app.short_description}
          </span>
        </div>
      </div>
    </Link>
  );
};

/* eslint-disable @next/next/no-img-element */
export const ExternalTvLink = ({ app }: TvLinkProps) => {
  return (
    <a
      rel="noopener noreferrer"
      title=""
      href={app.external_url}
      target="_blank"
    >
      <div className="relative flex w-full cursor-pointer flex-row items-center rounded-md border p-5 text-center shadow-xs hover:bg-slate-50 md:h-40 md:w-40 md:max-w-40 md:flex-col md:justify-center md:p-0">
        <ExternalLink className="absolute top-1 left-1 h-4 w-4 text-slate-400" />
        {app.audience_type.length > 0 ? (
          <Badge
            variant="destructive"
            className="absolute top-1 right-1 rounded-full bg-slate-300 text-xs font-light text-gray-700 shadow-none hover:bg-slate-300"
          >
            {app.audience_type}
          </Badge>
        ) : null}
        <div className="flex items-center md:grow md:justify-center">
          <img
            src={app.logo_url}
            alt={app.name}
            className="h-16 w-16 object-contain md:h-24 md:w-24"
          />
        </div>
        <div className="flex flex-col items-start p-2 md:w-full md:items-center md:bg-slate-100">
          <span className="md:text-sm">{app.name}</span>
          <span className="text-xs text-slate-500 md:hidden">
            {app.short_description}
          </span>
        </div>
      </div>
    </a>
  );
};
