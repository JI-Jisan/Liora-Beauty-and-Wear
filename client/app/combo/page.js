import CollectionPage from "../collection/[slug]/page";

export default function ComboPage() {
  return <CollectionPage params={Promise.resolve({ slug: "combo" })} />;
}
