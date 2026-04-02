declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_API_URL: string
    NEXT_PUBLIC_WS_URL: string
    NEXT_PUBLIC_GIPHY_API_KEY?: string
  }
}
