export interface XCredentials {
  handle: string;
  authMethod: 'api' | 'cookie';
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
  cookieToken: string;
  ct0Token: string;
  aiProvider: 'openai' | 'claude';
  aiApiKey: string;
}

export const defaultCredentials: XCredentials = {
  handle: '',
  authMethod: 'api',
  apiKey: '',
  apiSecret: '',
  accessToken: '',
  accessTokenSecret: '',
  cookieToken: '',
  ct0Token: '',
  aiProvider: 'openai',
  aiApiKey: '',
};

export type LogLevel = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

export interface TerminalLog {
  id: number;
  timestamp: string;
  level: LogLevel;
  message: string;
}

export type HuntingTab = 'scrape' | 'dm' | 'inbox';
