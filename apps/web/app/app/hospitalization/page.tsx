import { redirect } from "next/navigation";

/** Legacy path; canonical hospitalization UI is `/app/hospitalisation`. */
function serializeSearchParams(
  sp: Record<string, string | string[] | undefined>,
): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) v.forEach((x) => u.append(k, x));
    else u.set(k, v);
  }
  const s = u.toString();
  return s ? `?${s}` : "";
}

export default async function HospitalizationLegacyRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  redirect(`/app/hospitalisation${serializeSearchParams(sp)}`);
}
