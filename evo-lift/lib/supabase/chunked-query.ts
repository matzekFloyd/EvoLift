/** Each id is 36 characters, and the API rejects very long GET URLs. */
const ID_CHUNK_SIZE = 80;
/** Hosted and local PostgREST both stop a response at this many rows. */
const PAGE_SIZE = 1000;

type PageError = { message: string; code?: string };

type PageResult<T> = {
  data: T[] | null;
  error: PageError | null;
};

function isRangeNotSatisfiable(error: PageError): boolean {
  return error.code === "PGRST103";
}

/** Read every row, following the 1000-row cap. `queryPage` must use a stable `.order()`. */
export async function fetchAllPages<T>(
  queryPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<{ data: T[]; error: PageError | null }> {
  const data: T[] = [];
  let from = 0;
  for (;;) {
    const { data: page, error } = await queryPage(from, from + PAGE_SIZE - 1);
    if (error) {
      if (isRangeNotSatisfiable(error)) {
        break;
      }
      return { data, error };
    }
    const rows = page ?? [];
    data.push(...rows);
    if (rows.length < PAGE_SIZE) {
      break;
    }
    from += PAGE_SIZE;
  }
  return { data, error: null };
}

/** Run an `in` filter in URL-sized chunks, and page each chunk past the row cap. */
export async function fetchInChunks<T>(
  ids: readonly string[],
  queryChunk: (ids: string[], from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<{ data: T[]; error: PageError | null }> {
  if (ids.length === 0) {
    return { data: [], error: null };
  }
  const data: T[] = [];
  for (let index = 0; index < ids.length; index += ID_CHUNK_SIZE) {
    const chunk = ids.slice(index, index + ID_CHUNK_SIZE);
    const page = await fetchAllPages((from, to) => queryChunk(chunk, from, to));
    if (page.error) {
      return { data, error: page.error };
    }
    data.push(...page.data);
  }
  return { data, error: null };
}
