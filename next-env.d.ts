/// <reference types="next" />
/// <reference types="next/types/global" />
/// <reference types="node" />

namespace NodeJS {
  interface ProcessEnv {
    MONGODB_URI: string;
    MONGODB_DB: string;
    MAILGUN_API_KEY: string;
    MAILGUN_API_BASE: string;
    JWT_SECRET_KEY: string;
    APP_HOST: string;
  }
}
