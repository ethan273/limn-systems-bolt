/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'intuit-oauth' {
  interface OAuthClientConfig {
    clientId: string
    clientSecret: string
    environment: 'sandbox' | 'production'
    redirectUri?: string
    logging?: boolean
  }

  class OAuthClient {
    constructor(config: OAuthClientConfig)
    token: any
    refresh(): Promise<any>
    [key: string]: any
  }

  export = OAuthClient
}