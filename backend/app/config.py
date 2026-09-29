from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SECRET_KEY: str = "ecliptica-super-secret-key-change-this-later"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    MAIL_HOST: str = ""
    MAIL_PORT: int = 587
    MAIL_USER: str = ""
    MAIL_PASS: str = ""
    MAIL_FROM: str = ""
    APP_URL: str = "https://ecliptica-eight.vercel.app"

    class Config:
        env_file = ".env"

settings = Settings()
