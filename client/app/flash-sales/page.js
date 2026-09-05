import CollectionPage from "../collection/[slug]/page";

export default function FlashSalesPage() {
  return <CollectionPage params={Promise.resolve({ slug: "flash-sales" })} />;
}
