import type { GetServerSideProps } from 'next';

// Old links (emails, bookmarks) from when every page had a language prefix (81). Pages in
// pages/nl/ win over this route. Leading slashes and backslashes are collapsed, so `/nl//evil.com`
// can't become a protocol-relative redirect off the site.
export const getServerSideProps: GetServerSideProps = async ({ resolvedUrl }) => ({
  redirect: { destination: `/${resolvedUrl.replace(/^\/nl[/\\]+/, '')}`, permanent: true },
});

export default function OldLanguageLink() {
  return null;
}
