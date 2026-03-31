// Mock Supabase client for development
// This is a chainable mock that supports .select().eq().order() etc.
const createChainableMock = () => {
  const mockResponse = { data: [], error: null };
  const chain: any = {
    select: (..._args: any[]) => chain,
    insert: (..._args: any[]) => chain,
    update: (..._args: any[]) => chain,
    delete: (..._args: any[]) => chain,
    eq: (..._args: any[]) => chain,
    neq: (..._args: any[]) => chain,
    gt: (..._args: any[]) => chain,
    gte: (..._args: any[]) => chain,
    lt: (..._args: any[]) => chain,
    lte: (..._args: any[]) => chain,
    like: (..._args: any[]) => chain,
    ilike: (..._args: any[]) => chain,
    is: (..._args: any[]) => chain,
    in: (..._args: any[]) => chain,
    contains: (..._args: any[]) => chain,
    containedBy: (..._args: any[]) => chain,
    rangeGt: (..._args: any[]) => chain,
    rangeGte: (..._args: any[]) => chain,
    rangeLt: (..._args: any[]) => chain,
    rangeLte: (..._args: any[]) => chain,
    rangeAdjacent: (..._args: any[]) => chain,
    overlaps: (..._args: any[]) => chain,
    textSearch: (..._args: any[]) => chain,
    match: (..._args: any[]) => chain,
    not: (..._args: any[]) => chain,
    or: (..._args: any[]) => chain,
    filter: (..._args: any[]) => chain,
    order: (..._args: any[]) => chain,
    limit: (..._args: any[]) => chain,
    range: (..._args: any[]) => chain,
    single: (..._args: any[]) => mockResponse,
    maybeSingle: (..._args: any[]) => mockResponse,
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
