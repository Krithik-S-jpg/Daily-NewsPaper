from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    frontend_url: str = "http://127.0.0.1:3000"
    ai_base_url: str = "https://api.openai.com/v1"
    ai_api_key: str = ""
    ai_model: str = ""
    resend_api_key: str = ""
    email_from: str = ""
    github_token: str = ""
    youtube_api_key: str = ""
    reddit_access_token: str = ""


@lru_cache
def settings():
    return Settings()
