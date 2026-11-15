import { useState, useRef, useEffect } from "react";
// Locally synthesized ambience: no external audio downloads or autoplay.
export function Soundscape() {
  const [sound, setSound] = useState("Silencio");
  const [volume, setVolume] = useState(0.15);
  const [error, setError] = useState("");
  const audio = useRef<AudioContext | null>(null);
  const gain = useRef<GainNode | null>(null);
  function stop() {
    if (audio.current) {
      void audio.current.close();
      audio.current = null;
    }
    gain.current = null;
  }
  useEffect(() => () => stop(), []);
  async function play(name: string) {
    stop();
    setSound("Silencio");
    setError("");
    if (name === "Silencio") return;
    try {
      const context = new AudioContext();
      audio.current = context;
      await context.resume();
      const buffer = context.createBuffer(1, context.sampleRate * 4, context.sampleRate);
      const a = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < a.length; i++) {
        last = (last + Math.random() * 0.04 - 0.02) / 1.02;
        a[i] = name === "Viento" ? last * 4 : (Math.random() * 2 - 1) * 0.35;
      }
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = name === "Lluvia" ? 1800 : 350;
      const g = context.createGain();
      g.gain.value = volume;
      gain.current = g;
      source.connect(filter).connect(g).connect(context.destination);
      source.start();
      setSound(name);
    } catch {
      stop();
      setError("No se pudo iniciar el sonido en este navegador.");
    }
  }
  return (
    <section className="mt-6">
      <h3 className="font-semibold mb-3">Tu atmósfera</h3>
      <div className="flex flex-wrap gap-2">
        {["Silencio", "Lluvia", "Viento"].map((s) => (
          <button
            key={s}
            className={`koa-chip ${s === sound ? "active" : ""}`}
            aria-pressed={s === sound}
            onClick={() => play(s)}
          >
            {s}
          </button>
        ))}
      </div>
      {sound !== "Silencio" && (
        <label className="koa-label mt-4">
          Volumen
          <input
            aria-label="Volumen de ambiente"
            className="w-full mt-2"
            type="range"
            min="0"
            max="0.5"
            step="0.01"
            value={volume}
            onChange={(e) => {
              setVolume(Number(e.target.value));
              if (gain.current) gain.current.gain.value = Number(e.target.value);
            }}
          />
        </label>
      )}
      <p className="koa-muted mt-2 text-xs">
        Ambientes sintetizados. El sonido se detiene al salir de esta vista.
      </p>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
