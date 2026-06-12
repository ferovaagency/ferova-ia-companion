const AMAZON_AFFILIATE_TAG = "libreroia-21";

export function amazonSearchUrl(title: string, author?: string | null) {
  const q = encodeURIComponent([title, author].filter(Boolean).join(" "));
  return `https://www.amazon.com/s?k=${q}&i=stripbooks&tag=${AMAZON_AFFILIATE_TAG}`;
}

/**
 * Adds the book to the user's Amazon Wish List using the "add to wishlist via search" flow.
 * Amazon does not expose a public deep link to add by title, so we point to the search page
 * with the affiliate tag — from there the user taps "Add to List".
 */
export function amazonWishlistUrl(title: string, author?: string | null) {
  return amazonSearchUrl(title, author);
}