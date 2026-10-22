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

/** Session path. The first exercise omits `ex`. */
export function sessionDetailExercisePath(sessionId: string, exerciseId: string | null): string {
  const path = `/sessions/${sessionId}`;
  if (!exerciseId) {
    return path;
  }
  return sessionDetailHref(path, "", (params) => {
    params.set(SESSION_DETAIL_EXERCISE_QUERY, exerciseId);
  });
}
