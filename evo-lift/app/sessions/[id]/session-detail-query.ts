export const SESSION_DETAIL_EXERCISE_QUERY = "ex";

export function sessionDetailHref(
  pathname: string,
  search: string,
  mutator: (params: URLSearchParams) => void,
): string {
  const params = new URLSearchParams(search);
  mutator(params);
  const qs = params.toString();
  return `${pathname}${qs ? `?${qs}` : ""}`;
}
