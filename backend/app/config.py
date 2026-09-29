from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SECRET_KEY: str = "ecliptica-super-secret-key-change-this-later"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Email settings will be added after the deployment variables are configured.
    class Config:
        env_file = ".env"

settings = Settings()
