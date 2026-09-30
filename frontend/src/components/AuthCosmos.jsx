export default function AuthCosmos() {
  const stars = [
    { top: "12%", left: "18%", size: "sm", twinkle: "2.8s", drift: "9s", delay: "0s" },
    { top: "22%", left: "78%", size: "md", twinkle: "3.4s", drift: "11s", delay: "0.4s" },
    { top: "35%", left: "8%", size: "sm", twinkle: "2.2s", drift: "7s", delay: "1s" },
    { top: "48%", left: "88%", size: "lg", twinkle: "4s", drift: "12s", delay: "0.2s" },
    { top: "62%", left: "15%", size: "md", twinkle: "3s", drift: "8s", delay: "1.5s" },
    { top: "70%", left: "72%", size: "sm", twinkle: "2.5s", drift: "10s", delay: "0.8s" },
    { top: "18%", left: "42%", size: "sm", twinkle: "3.6s", drift: "9s", delay: "2s" },
    { top: "78%", left: "40%", size: "md", twinkle: "2.9s", drift: "13s", delay: "0.6s" },
    { top: "30%", left: "55%", size: "sm", twinkle: "3.1s", drift: "8.5s", delay: "1.2s" },
    { top: "55%", left: "28%", size: "lg", twinkle: "4.2s", drift: "14s", delay: "0.3s" },
    { top: "40%", left: "92%", size: "sm", twinkle: "2.4s", drift: "7.5s", delay: "1.8s" },
    { top: "85%", left: "60%", size: "sm", twinkle: "3.3s", drift: "11s", delay: "0.9s" },
    { top: "8%", left: "65%", size: "md", twinkle: "2.7s", drift: "9.5s", delay: "1.4s" },
    { top: "90%", left: "22%", size: "sm", twinkle: "3.8s", drift: "10s", delay: "0.5s" },
  ];

  return (
    <div className="cosmos-layer" aria-hidden="true">
      {/* ambient color orbs */}
      <div className="absolute top-[15%] left-[20%] w-72 h-72 rounded-full bg-purple-600/20 blur-[90px]" />
      <div className="absolute bottom-[20%] right-[15%] w-96 h-96 rounded-full bg-indigo-600/15 blur-[110px]" />
      <div className="absolute top-[50%] right-[30%] w-40 h-40 rounded-full bg-fuchsia-500/10 blur-[60px]" />

      {/* stars */}
      {stars.map((s, i) => (
        <span
          key={i}
          className={`cosmos-star ${s.size}`}
          style={{
            top: s.top,
            left: s.left,
            "--twinkle": s.twinkle,
            "--drift": s.drift,
            animationDelay: s.delay,
          }}
        />
      ))}

      {/* soft planet — violet */}
      <div
        className="cosmos-planet"
        style={{ top: "16%", right: "12%", width: 36, height: 36, "--float": "11s" }}
      >
        <div
          className="cosmos-planet-core"
          style={{
            background:
              "radial-gradient(circle at 32% 28%, #ddd6fe, #7c3aed 55%, #4c1d95)",
            boxShadow: "0 0 28px rgba(124, 58, 237, 0.45)",
          }}
        />
        <div className="cosmos-planet-ring" />
      </div>

      {/* smaller teal planet */}
      <div
        className="cosmos-planet"
        style={{ bottom: "18%", left: "10%", width: 22, height: 22, "--float": "9s" }}
      >
        <div
          className="cosmos-planet-core"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, #a5f3fc, #0891b2 60%, #164e63)",
            boxShadow: "0 0 20px rgba(34, 211, 238, 0.35)",
          }}
        />
      </div>

      {/* tiny moon orbiting near left */}
      <div
        className="absolute"
        style={{ top: "58%", left: "20%", width: 1, height: 1 }}
      >
        <span className="cosmos-moon" />
      </div>

      {/* faint far planet */}
      <div
        className="cosmos-planet"
        style={{ top: "72%", right: "22%", width: 14, height: 14, "--float": "13s" }}
      >
        <div
          className="cosmos-planet-core"
          style={{
            background:
              "radial-gradient(circle at 35% 30%, #fce7f3, #db2777 65%, #831843)",
            boxShadow: "0 0 16px rgba(236, 72, 153, 0.3)",
            opacity: 0.85,
          }}
        />
      </div>
    </div>
  );
}
