import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # Discord
    DISCORD_BOT_TOKEN: str = os.getenv("DISCORD_BOT_TOKEN", "")
    DISCORD_GUILD_ID: str = os.getenv("DISCORD_GUILD_ID", "")
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./discboard.db")
    
    # API
    API_PORT: int = int(os.getenv("API_PORT", "8000"))
    API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "discboard-secret-key-change-in-production")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    
    # Uptime Kuma
    UPTIME_KUMA_URL: str = os.getenv("UPTIME_KUMA_URL", "http://172.20.0.5:3001")
    UPTIME_KUMA_API_KEY: str = os.getenv("UPTIME_KUMA_API_KEY", "")
    
    # GitHub
    GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "")
    GITHUB_ORG: str = os.getenv("GITHUB_ORG", "BMillerCodes")
    
    # Hermes (optional integration)
    HERMES_API_URL: str = os.getenv("HERMES_API_URL", "http://localhost:8000")
    HERMES_API_KEY: str = os.getenv("HERMES_API_KEY", "")

settings = Settings()