import AftercareClient from "@/app/client/aftercare/AftercareClient";

export default function AftercarePage({
  searchParams,
}: {
  searchParams?: { token?: string };
}) {
  const token =
    typeof searchParams?.token === "string" ? searchParams.token : undefined;
  return <AftercareClient initialToken={token} />;
}
