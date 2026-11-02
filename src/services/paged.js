// Fetches every row of a query in pages (PostgREST caps a single response at 1000 rows).
// `build` must return a fresh query each call, with a stable order.
export async function fetchAllPages(build, pageSize = 1000) {
  const all = [];
  for (let from = 0; from < 500000; from += pageSize) {
    const { data, error } = await build().range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    all.push(...data);
    if (data.length < pageSize) break;
  }
  return all;
}