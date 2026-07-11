// Web Audio API Synthesizer for high-end premium acoustic audio preview
class AudioSynthManager {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private timerId: any = null;
  private synthNodes: AudioNode[] = [];
  private startTime = 0;
  private duration = 30; // 30 seconds demo
  private onTickCallback: ((progress: number, currentTime: number) => void) | null = null;

  private initContext() {
    if (!this.ctx) {
      // Create audio context supporting prefix for older safari
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Pluck a guitar string
  private pluckGuitar(time: number, freq: number, velocity = 0.8) {
    if (!this.ctx) return;
    
    // Combined oscillator for rich acoustics
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc1.type = 'triangle';
    osc2.type = 'sine';

    // Slightly detune to sound organic
    osc1.frequency.setValueAtTime(freq, time);
    osc2.frequency.setValueAtTime(freq * 1.005, time);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000, time);
    filter.frequency.exponentialRampToValueAtTime(150, time + 0.4);
    filter.Q.setValueAtTime(1, time);

    // Envelope for a plucked string (instant attack, long decay)
    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(velocity * 0.25, time + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 1.2);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    this.synthNodes.push(osc1, osc2, gainNode, filter);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + 1.3);
    osc2.stop(time + 1.3);
  }

  // Create an expressive vocal hum
  private singVocalNote(time: number, duration: number, freq: number, targetFreq: number, gender: 'masculine' | 'feminine') {
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const vibrato = this.ctx.createOscillator();
    const vibratoGain = this.ctx.createGain();
    const vocalGain = this.ctx.createGain();
    const formantFilter = this.ctx.createBiquadFilter();

    // Voice base type
    osc.type = 'triangle';

    // Pitch slide (portamento) and pitch stabilization
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(targetFreq, time + 0.15);

    // Vibrato (vocal oscillation)
    vibrato.frequency.setValueAtTime(5.5, time); // 5.5 Hz vibrato
    vibratoGain.gain.setValueAtTime(2.5, time); // depth of detune

    // Voice Formant simulation using bandpass around vocal core frequencies
    // Male vowel 'ah' around 600Hz, Female around 800Hz
    formantFilter.type = 'peaking';
    formantFilter.frequency.setValueAtTime(gender === 'masculine' ? 550 : 800, time);
    formantFilter.Q.setValueAtTime(1.5, time);
    formantFilter.gain.setValueAtTime(12, time);

    // Smooth vocal envelope
    vocalGain.gain.setValueAtTime(0, time);
    vocalGain.gain.linearRampToValueAtTime(0.06, time + 0.1); // soft attack
    vocalGain.gain.setValueAtTime(0.06, time + duration - 0.15);
    vocalGain.gain.exponentialRampToValueAtTime(0.0001, time + duration); // smooth release

    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);
    osc.connect(formantFilter);
    formantFilter.connect(vocalGain);
    vocalGain.connect(this.ctx.destination);

    this.synthNodes.push(osc, vibrato, vibratoGain, formantFilter, vocalGain);

    vibrato.start(time);
    osc.start(time);
    vibrato.stop(time + duration);
    osc.stop(time + duration);
  }

  public playDemo(
    style: 'sertanejo' | 'piseiro',
    gender: 'masculine' | 'feminine',
    onTick: (progress: number, currentTime: number) => void
  ) {
    this.stop();
    this.initContext();
    if (!this.ctx) return;

    this.isPlaying = true;
    this.startTime = this.ctx.currentTime;
    this.onTickCallback = onTick;

    // Define harmonic scales & chord patterns
    // Sertanejo: Em - C - G - D (Emotional)
    // Piseiro: Am - F - C - G (Upbeat & rhythmic)
    const chords = style === 'sertanejo' 
      ? [
          [164.81, 196.00, 246.94, 329.63], // Em (E3, G3, B3, E4)
          [130.81, 164.81, 196.00, 261.63], // C
          [196.00, 246.94, 293.66, 392.00], // G
          [146.83, 220.00, 293.66, 369.99]  // D
        ]
      : [
          [110.00, 164.81, 220.00, 261.63], // Am (A2, E3, A3, C4)
          [174.61, 220.00, 261.63, 349.23], // F
          [130.81, 196.00, 261.63, 329.63], // C
          [196.00, 246.94, 293.66, 392.00]  // G
        ];

    const melodyNotes = style === 'sertanejo'
      ? [
          // Emotional melody over Em, C, G, D
          [329.63, 392.00, 440.00, 392.00], // E4, G4, A4, G4
          [261.63, 329.63, 392.00, 329.63], // C4, E4, G4, E4
          [392.00, 493.88, 440.00, 392.00], // G4, B4, A4, G4
          [293.66, 369.99, 440.00, 369.99]  // D4, F#4, A4, F#4
        ]
      : [
          // Rhythmic catchy melody over Am, F, C, G
          [440.00, 440.00, 493.88, 523.25], // A4, A4, B4, C5
          [349.23, 349.23, 392.00, 440.00], // F4, F4, G4, A4
          [523.25, 523.25, 493.88, 392.00], // C5, C5, B4, G4
          [392.00, 392.00, 440.00, 293.66]  // G4, G4, A4, D4
        ];

    let currentChordIdx = 0;
    const scheduleAhead = 1.0; // schedule notes 1 second ahead
    let nextNoteTime = this.ctx.currentTime + 0.1;
    const tempo = style === 'sertanejo' ? 82 : 115; // BPM
    const beatDuration = 60 / tempo;
    const eighthNote = beatDuration / 2;

    let tickCount = 0;

    const scheduler = () => {
      if (!this.isPlaying || !this.ctx) return;

      while (nextNoteTime < this.ctx.currentTime + scheduleAhead) {
        const chord = chords[currentChordIdx];
        const notes = melodyNotes[currentChordIdx];

        if (style === 'sertanejo') {
          // Sertanejo Arpeggio (8th notes pattern)
          const step = tickCount % 8;
          if (step === 0) this.pluckGuitar(nextNoteTime, chord[0], 0.9); // Root
          else if (step === 2) this.pluckGuitar(nextNoteTime, chord[1], 0.7); // 3rd/5th
          else if (step === 4) this.pluckGuitar(nextNoteTime, chord[2], 0.7); // 5th/8ve
          else if (step === 6) this.pluckGuitar(nextNoteTime, chord[3], 0.8); // 8ve/melody accent
          else if (step === 1 || step === 3 || step === 5 || step === 7) {
            // ghost notes
            const randNote = chord[Math.floor(Math.random() * chord.length)];
            this.pluckGuitar(nextNoteTime, randNote, 0.4);
          }

          // Vocal sings on major beats
          if (tickCount % 4 === 0) {
            const vocalIdx = Math.floor(tickCount / 4) % notes.length;
            const freq = notes[vocalIdx];
            const nextFreq = notes[(vocalIdx + 1) % notes.length];
            // Render vocal line (lower octave if male)
            const factor = gender === 'masculine' ? 0.5 : 1.0;
            this.singVocalNote(nextNoteTime, beatDuration * 1.8, freq * factor, nextFreq * factor, gender);
          }
        } else {
          // Piseiro Rhythmic Strumming & syncopation
          const step = tickCount % 4;
          if (step === 0) {
            // Strong strum down
            chord.forEach((f, i) => {
              this.pluckGuitar(nextNoteTime + (i * 0.015), f, 0.9 - (i * 0.05));
            });
          } else if (step === 2) {
            // Offbeat pluck
            this.pluckGuitar(nextNoteTime, chord[2], 0.75);
            this.pluckGuitar(nextNoteTime + 0.05, chord[3], 0.6);
          } else if (step === 1 || step === 3) {
            // Subtle upstrum ghost
            chord.slice(1).forEach((f, i) => {
              this.pluckGuitar(nextNoteTime + (i * 0.01), f, 0.35);
            });
          }

          // Rhythmic vocals
          if (step === 0 || step === 2) {
            const vocalIdx = Math.floor(tickCount / 2) % notes.length;
            const freq = notes[vocalIdx];
            const nextFreq = notes[(vocalIdx + 1) % notes.length];
            const factor = gender === 'masculine' ? 0.5 : 1.0;
            this.singVocalNote(nextNoteTime, beatDuration * 0.95, freq * factor, nextFreq * factor, gender);
          }
        }

        tickCount++;
        if (tickCount % (style === 'sertanejo' ? 8 : 4) === 0) {
          currentChordIdx = (currentChordIdx + 1) % chords.length;
        }

        nextNoteTime += style === 'sertanejo' ? eighthNote : eighthNote * 2; // update scheduler clock
      }

      // Progress tick update
      const elapsed = this.ctx.currentTime - this.startTime;
      if (elapsed >= this.duration) {
        this.stop();
      } else {
        if (this.onTickCallback) {
          const progress = (elapsed / this.duration) * 100;
          this.onTickCallback(progress, elapsed);
        }
        this.timerId = setTimeout(scheduler, 100);
      }
    };

    scheduler();
  }

  public stop() {
    this.isPlaying = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    // Cancel and clean all scheduled nodes
    this.synthNodes.forEach(node => {
      try {
        (node as any).stop?.();
        (node as any).disconnect?.();
      } catch (e) {
        // Safe-ignore
      }
    });
    this.synthNodes = [];
    if (this.onTickCallback) {
      this.onTickCallback(0, 0);
    }
  }
}

export const audioSynth = new AudioSynthManager();
