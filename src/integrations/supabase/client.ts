// Mock Supabase client for development
// This is a chainable mock that supports .select().eq().order() etc.
const createChainableMock = () => {
  const mockResponse = { data: [], error: null };
  const chain = {
    select: () => chain,
    insert: () => chain,
    update: () => chain,
    delete: () => chain,
    eq: () => chain,
    neq: () => chain,
    gt: () => chain,
    gte: () => chain,
    lt: () => chain,
    lte: () => chain,
    like: () => chain,
    ilike: () => chain,
    is: () => chain,
    in: () => chain,
    contains: () => chain,
    containedBy: () => chain,
    rangeGt: () => chain,
    rangeGte: () => chain,
    rangeLt: () => chain,
    rangeLte: () => chain,
    rangeAdjacent: () => chain,
    overlaps: () => chain,
    textSearch: () => chain,
    match: () => chain,
    not: () => chain,
    or: () => chain,
    filter: () => chain,
    order: () => chain,
    limit: () => chain,
    range: () => chain,
    single: () => mockResponse,
    maybeSingle: () => mockResponse,
    then: (resolve: any) => resolve(mockResponse), // For async/await
  };
  return chain;
};

export const supabase = {
  from: () => createChainableMock(),
  auth: {
    getSession: () => ({ data: { session: null }, error: null }),
    signIn: () => ({ data: null, error: null }),
    signOut: () => ({ error: null })
  }
};

export default supabase;
