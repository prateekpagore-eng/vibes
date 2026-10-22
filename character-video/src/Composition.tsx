import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/fonts";
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  Composition,
  Easing,
  Img,
  Interactive,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

await loadFont({
  family: "Luckiest Guy",
  url: staticFile("fonts/luckiest-guy-latin-400-normal.woff2"),
});

type Props = {};

const FPS = 30;
// Half a spin: frames to turn edge-on, and frames to turn back.
const SPIN_OUT = 7;
const SPIN_IN = 12;
const LANDING = 16;

type Role = {
  label: string;
  file: string;
  accent: string;
  deep: string;
  // Frame where the outfit swaps (character is edge-on).
  swapAt: number;
};

const ROLES: Role[] = [
  { label: "The Builder", file: "builder", accent: "#F2B33D", deep: "#5A3A0A", swapAt: 0 },
  { label: "The CEO", file: "ceo", accent: "#5B7BC0", deep: "#121B33", swapAt: 75 },
  { label: "The Scientist", file: "scientist", accent: "#3FC1D9", deep: "#0B3440", swapAt: 120 },
  { label: "The Detective", file: "detective", accent: "#C89A5B", deep: "#3A2610", swapAt: 165 },
  { label: "The Engineer", file: "engineer", accent: "#FF8A2A", deep: "#4A1F00", swapAt: 210 },
  { label: "The Director", file: "director", accent: "#E5484D", deep: "#3A0B10", swapAt: 255 },
];

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const roleIndexAt = (frame: number) =>
  ROLES.reduce((acc, r, i) => (frame >= r.swapAt ? i : acc), 0);

const calculateMetadata: CalculateMetadataFunction<Props> = () => {
  return {};
};

export const MyComposition = () => {
  return (
    <Composition
      id="RoleSwap"
      component={MyComponent}
      durationInFrames={10 * FPS}
      fps={FPS}
      width={1080}
      height={1920}
      calculateMetadata={calculateMetadata}
    />
  );
};

const Backgrounds: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      {ROLES.map((r, i) => (
        <AbsoluteFill
          key={r.file}
          name={`Background ${r.label}`}
          style={{
            background: `radial-gradient(circle at 50% 58%, ${r.accent} 0%, ${r.deep} 72%)`,
            opacity:
              i === 0
                ? 1
                : interpolate(frame, [r.swapAt - 2, r.swapAt + 6], [0, 1], {
                    ...clamp,
                    easing: Easing.bezier(0.16, 1, 0.3, 1),
                  }),
          }}
        />
      ))}
      {/* Blueprint grid, a nod to the character sheet */}
      <AbsoluteFill
        name="Grid"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.07) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.07) 2px, transparent 2px)",
          backgroundSize: "90px 90px",
          backgroundPosition: "center",
          translate: `0px ${(frame * 1.5) % 90}px`,
        }}
      />
    </>
  );
};

const Burst: React.FC<{ color: string }> = ({ color }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [0, 14], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const rays = 14;
  return (
    <svg
      width={1080}
      height={1080}
      viewBox="-540 -540 1080 1080"
      style={{ position: "absolute", left: 0, top: 1080 - 540 - 40, opacity: 1 - t }}
    >
      <circle r={120 + t * 380} fill="none" stroke="white" strokeWidth={28 * (1 - t) + 2} />
      {Array.from({ length: rays }).map((_, i) => {
        const a = (i / rays) * Math.PI * 2;
        const r0 = 200 + t * 260;
        const r1 = r0 + 110 * (1 - t) + 10;
        return (
          <line
            key={i}
            x1={Math.cos(a) * r0}
            y1={Math.sin(a) * r0}
            x2={Math.cos(a) * r1}
            y2={Math.sin(a) * r1}
            stroke={i % 2 ? "white" : color}
            strokeWidth={18}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
};

const Character: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const idx = roleIndexAt(frame);
  const role = ROLES[idx];

  // Entrance: drop from above, squash on landing, settle.
  const drop = interpolate(frame, [0, LANDING], [-1700, 0], {
    ...clamp,
    easing: Easing.bezier(0.55, 0, 1, 0.45),
  });
  const settle = spring({ frame: frame - LANDING, fps, config: { damping: 7, stiffness: 180 } });
  const squash = frame < LANDING ? 0 : 1 - settle;

  // Spin: turn to edge-on before the swap, spring back after it.
  const next = ROLES[idx + 1];
  let angle = 0;
  if (next && frame >= next.swapAt - SPIN_OUT) {
    angle = interpolate(frame, [next.swapAt - SPIN_OUT, next.swapAt], [0, 90], {
      ...clamp,
      easing: Easing.in(Easing.quad),
    });
  } else if (idx > 0 && frame < role.swapAt + SPIN_IN * 2) {
    const s = spring({ frame: frame - role.swapAt, fps, config: { damping: 11, stiffness: 160 } });
    angle = -90 + 90 * s;
  }
  const pop =
    idx > 0
      ? 1 + 0.12 * Math.sin(Math.PI * interpolate(frame, [role.swapAt, role.swapAt + SPIN_IN], [0, 1], clamp))
      : 1;

  const bob = frame > LANDING + 15 ? Math.sin((frame - LANDING) / 9) * 6 : 0;
  const edgeOn = Math.abs(Math.cos((angle * Math.PI) / 180));

  return (
    <AbsoluteFill name="Character" style={{ perspective: 1600 }}>
      {/* Floor shadow narrows as he turns edge-on */}
      <div
        style={{
          position: "absolute",
          left: 540 - 230,
          top: 1592,
          width: 460,
          height: 70,
          borderRadius: "50%",
          background: "rgba(0,0,0,0.35)",
          filter: "blur(6px)",
          scale: `${interpolate(drop, [-1700, 0], [0.3, 1]) * (0.45 + 0.55 * edgeOn) * (1 + squash * 0.25)} 1`,
          opacity: interpolate(drop, [-1700, 0], [0, 1]),
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          width: 1080,
          top: 520,
          height: 1100,
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-end",
          transformOrigin: "50% 100%",
          translate: `0px ${drop + bob}px`,
          scale: `${pop * (1 + squash * 0.18)} ${pop * (1 - squash * 0.2)}`,
          rotate: `y ${angle}deg`,
        }}
      >
        <Img
          name={role.label}
          src={staticFile(`roles/${role.file}.png`)}
          style={{
            height: 1100,
            maxWidth: 960,
            objectFit: "contain",
            objectPosition: "bottom",
            filter: "drop-shadow(0 18px 24px rgba(0,0,0,0.35))",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

const RoleLabel: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const idx = roleIndexAt(frame);
  const role = ROLES[idx];
  const next = ROLES[idx + 1];
  const start = idx === 0 ? LANDING : role.swapAt;

  const enter = spring({ frame: frame - start, fps, config: { damping: 10, stiffness: 170 } });
  const exit = next
    ? interpolate(frame, [next.swapAt - SPIN_OUT, next.swapAt], [1, 0], {
        ...clamp,
        easing: Easing.in(Easing.quad),
      })
    : 1;

  return (
    <Interactive.Div
      name="Role label"
      style={{
        position: "absolute",
        top: 240,
        left: 80,
        right: 80,
        textAlign: "center",
        fontFamily: "Luckiest Guy",
        fontSize: 132,
        lineHeight: 1,
        color: "white",
        WebkitTextStroke: "14px #1a1a1a",
        paintOrder: "stroke fill",
        textShadow: "0 10px 0 rgba(0,0,0,0.35)",
        textTransform: "uppercase",
        scale: Math.max(0, enter * exit),
        rotate: `${interpolate(enter, [0, 1], [-8, -3])}deg`,
        opacity: Math.min(1, enter * 3) * exit,
      }}
    >
      {role.label}
      <div
        style={{
          margin: "28px auto 0",
          width: interpolate(enter, [0, 1], [0, 360]),
          height: 16,
          borderRadius: 8,
          background: role.accent,
          border: "6px solid #1a1a1a",
        }}
      />
    </Interactive.Div>
  );
};

export const MyComponent: React.FC<Props> = () => {
  return (
    <AbsoluteFill name="Scene" style={{ backgroundColor: "#111" }}>
      <Backgrounds />
      {ROLES.slice(1).map((r) => (
        <Sequence key={r.file} name={`Burst ${r.label}`} from={r.swapAt} durationInFrames={16}>
          <Burst color={r.accent} />
        </Sequence>
      ))}
      <Character />
      <RoleLabel />

      {/* Sound */}
      <Audio src={staticFile("sfx/whoosh.wav")} volume={0.6} />
      <Sequence name="Landing thump" from={LANDING - 1} layout="none">
        <Audio src={staticFile("sfx/thump.wav")} />
      </Sequence>
      {ROLES.slice(1).map((r) => (
        <Sequence key={`w-${r.file}`} name={`Whoosh ${r.label}`} from={r.swapAt - SPIN_OUT - 2} layout="none">
          <Audio src={staticFile("sfx/whoosh.wav")} volume={0.55} />
        </Sequence>
      ))}
      {ROLES.slice(1).map((r) => (
        <Sequence key={`p-${r.file}`} name={`Pop ${r.label}`} from={r.swapAt} layout="none">
          <Audio src={staticFile("sfx/pop.wav")} volume={0.8} />
        </Sequence>
      ))}
      <Sequence name="Final sparkle" from={ROLES[ROLES.length - 1].swapAt + 2} layout="none">
        <Audio src={staticFile("sfx/sparkle.wav")} volume={0.5} />
      </Sequence>
    </AbsoluteFill>
  );
};
