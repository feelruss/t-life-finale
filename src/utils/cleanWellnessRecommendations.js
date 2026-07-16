const MAX_RECOMMENDATION_LENGTH = 220;
const REQUIRED_RECOMMENDATION_COUNT = 4;

export function cleanWellnessRecommendations(input) {
  if (!Array.isArray(input)) {
    throw new Error("AI recommendations must be an array.");
  }

  const cleaned = input
    .filter((item) => typeof item === "string")

    .map((item) =>
      item
        // Remove HTML tags
        .replace(/<[^>]*>/g, "")

        // Remove markdown bullet prefixes
        .replace(/^\s*[-*•]\s*/, "")

        // Remove numbered list prefixes
        .replace(/^\s*\d+[.)]\s*/, "")

        // Remove surrounding quotes
        .replace(/^["']|["']$/g, "")

        // Normalize repeated whitespace
        .replace(/\s+/g, " ")

        // Remove null characters
        .replace(/\0/g, "")

        .trim(),
    )

    // Remove empty strings
    .filter(Boolean)

    // Limit recommendation length
    .map((item) => item.slice(0, MAX_RECOMMENDATION_LENGTH))

    // Remove duplicates
    .filter(
      (item, index, array) =>
        array.findIndex(
          (other) => other.toLowerCase() === item.toLowerCase(),
        ) === index,
    )

    // Only keep 4
    .slice(0, REQUIRED_RECOMMENDATION_COUNT);

  if (cleaned.length !== REQUIRED_RECOMMENDATION_COUNT) {
    throw new Error(
      `AI must return exactly ${REQUIRED_RECOMMENDATION_COUNT} valid unique recommendations.`,
    );
  }

  return cleaned;
}