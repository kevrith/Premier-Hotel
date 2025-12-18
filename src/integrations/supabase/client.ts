// Mock Supabase client for development
export const supabase = {
  from: () => ({
    select: () => ({ data: [], error: null }),
    insert: () => ({ data: null, error: null }),
    update: () => ({ data: null, error: null }),
    delete: () => ({ data: null, error: null })
  }),
  auth: {
    getSession: () => ({ data: { session: null }, error: null }),
    signIn: () => ({ data: null, error: null }),
    signOut: () => ({ error: null })
  }
};

export default supabase;
