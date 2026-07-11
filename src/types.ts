export type VoiceGender = 'masculine' | 'feminine';
export type SongStyle = 'sertanejo_sofrencia' | 'piseiro_pop_acustico';

export interface CompositionInput {
  name: string;
  email: string;
  phone: string;
  songTitle: string;
  lyrics: string;
  voiceGender: VoiceGender;
  style: SongStyle;
  audioBlob: Blob | null;
  audioFileName: string | null;
}

export type OrderStatus = 'payment_pending' | 'processing' | 'ready';

export interface SubmittedOrder extends CompositionInput {
  id: string;
  status: OrderStatus;
  createdAt: string;
  pixCode: string;
}

export interface AudioDemoState {
  isPlaying: boolean;
  progress: number; // 0 to 100
  duration: number; // in seconds
  currentTime: number; // in seconds
}
