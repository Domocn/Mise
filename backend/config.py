import os

class Settings:
    def __init__(self):
        self.mongo_url: str = os.getenv("MONGO_URL", "mongodb://localhost:27017")
        self.db_name: str = os.getenv("DB_NAME", "kitchenry")
        self.jwt_secret: str = os.getenv("JWT_SECRET", "kitchenry_secret")
        self.jwt_algorithm: str = "HS256"

        self.llm_provider: str = os.getenv("LLM_PROVIDER", "ollama")
        self.ollama_url: str = os.getenv("OLLAMA_URL", "http://localhost:11434")
        self.ollama_model: str = os.getenv("OLLAMA_MODEL", "llama3")
        self.openai_api_key: str | None = os.getenv("OPENAI_API_KEY")
        self.anthropic_api_key: str | None = os.getenv("ANTHROPIC_API_KEY")
        
        # Embedded LLM (GPT4All) - runs completely offline
        self.embedded_model: str = os.getenv("EMBEDDED_MODEL", "Phi-3-mini-4k-instruct.Q4_0.gguf")
        self.embedded_models_path: str = os.getenv("EMBEDDED_MODELS_PATH", "./models")

        self.cors_origins: str = os.getenv("CORS_ORIGINS", "*")

        self.upload_dir: str = os.getenv("UPLOAD_DIR", "uploads")

settings = Settings()
