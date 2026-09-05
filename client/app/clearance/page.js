import CollectionPage from "../collection/[slug]/page";

export default function ClearancePage() {
  return <CollectionPage params={Promise.resolve({ slug: "clearance" })} />;
}
