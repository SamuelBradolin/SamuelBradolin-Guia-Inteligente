// @ts-ignore
import lamejs from 'lamejs';

export async function convertAudioToMp3(file: File | Blob): Promise<Blob> {
  // 1. Get ArrayBuffer from file
  const arrayBuffer = await file.arrayBuffer();
  
  // 2. Decode Audio Data
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  let decodedBuffer: AudioBuffer;
  try {
    decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  } catch (err) {
    console.error("decodeAudioData error:", err);
    // Fallback to original file if decoding fails
    return file;
  } finally {
    await audioCtx.close();
  }
  
  // 3. Downsample to mono at 22050 Hz to keep it compact
  const targetSampleRate = 22050; 
  const offlineCtx = new OfflineAudioContext(1, Math.max(1, Math.floor(decodedBuffer.duration * targetSampleRate)), targetSampleRate);
  
  // Create buffer source
  const source = offlineCtx.createBufferSource();
  source.buffer = decodedBuffer;
  source.connect(offlineCtx.destination);
  source.start(0);
  
  // Render downsampled audio
  const renderedBuffer = await offlineCtx.startRendering();
  const float32Samples = renderedBuffer.getChannelData(0);
  
  // 4. Convert Float32Array [-1.0, 1.0] to Int16Array [-32768, 32767]
  const int16Samples = new Int16Array(float32Samples.length);
  for (let i = 0; i < float32Samples.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Samples[i]));
    int16Samples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  // 5. Encode with lamejs
  // @ts-ignore
  const Mp3Encoder = lamejs.Mp3Encoder || (lamejs as any).default?.Mp3Encoder || (window as any).lamejs?.Mp3Encoder;
  if (!Mp3Encoder) {
    console.error("Mp3Encoder not found in lamejs module");
    return file;
  }
  
  const mp3encoder = new Mp3Encoder(1, targetSampleRate, 128); // mono, 22050Hz, 128kbps
  const mp3Data: Uint8Array[] = [];
  
  // Encode in chunks of 1152 samples
  const sampleBlockSize = 1152;
  for (let i = 0; i < int16Samples.length; i += sampleBlockSize) {
    const chunk = int16Samples.subarray(i, i + sampleBlockSize);
    const mp3buf = mp3encoder.encodeBuffer(chunk);
    if (mp3buf.length > 0) {
      mp3Data.push(new Uint8Array(mp3buf));
    }
  }
  
  const endBuf = mp3encoder.flush();
  if (endBuf.length > 0) {
    mp3Data.push(new Uint8Array(endBuf));
  }
  
  return new Blob(mp3Data, { type: 'audio/mp3' });
}
