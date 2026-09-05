import CollectionPage from "../collection/[slug]/page";

export default function FlashSaleSingularPage() {
  return <CollectionPage params={Promise.resolve({ slug: "flash-sales" })} />;
}
