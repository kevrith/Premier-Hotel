from supabase import create_client, Client
from app.core.config import settings


class SupabaseClient:
    """Supabase client singleton"""

    _instance: Client = None

    @classmethod
    def get_client(cls) -> Client:
        """Get or create Supabase client instance"""
        if cls._instance is None:
            cls._instance = create_client(
                settings.SUPABASE_URL, settings.SUPABASE_KEY
            )
        return cls._instance

    @classmethod
    def get_admin_client(cls) -> Client:
        """Get Supabase client with service role key (admin privileges)"""
        return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)


# Export convenience functions
def get_supabase() -> Client:
    """Get Supabase client for dependency injection"""
    return SupabaseClient.get_client()


def get_supabase_admin() -> Client:
    """Get Supabase admin client for dependency injection"""
    return SupabaseClient.get_admin_client()
