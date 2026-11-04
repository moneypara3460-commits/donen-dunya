import React, { useEffect, useMemo, useRef, useState, memo } from "react";
import {
  View, Text, Pressable, StyleSheet, SafeAreaView, StatusBar,
  Animated, Easing, useWindowDimensions
} from "react-native";
import { D, PS, DT, parseLevel, tileAt, newState, rotate, step } from "./engine";
import { LEVELS } from "./levels";

// ---------- Bölüm görünümü (yalnızca bölüm değişince çizilir) ----------
function Goal({ tile }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true })
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [.85, 1.12] });
  return <View style={{ width: tile, height: tile, alignItems: "center", justifyContent: "center" }}>
    <Animated.View style={[styles.goalOuter, { width: tile * .8, height: tile * .8, borderRadius: tile, transform: [{ scale }] }]}>
      <View style={[styles.goalInner, { width: tile * .4, height: tile * .4, borderRadius: tile }]} />
    </Animated.View>
  </View>;
}

const LevelView = memo(function LevelView({ lv, tile }) {
  const items = [];
  for (let r = 0; r < lv.rows; r++) for (let c = 0; c < lv.cols; c++) {
    const ch = lv.cells[r][c];
    if (ch === " ") continue;
    const pos = { position: "absolute", left: c * tile, top: r * tile, width: tile, height: tile };
    if (ch === "#") {
      items.push(<View key={r + "-" + c} style={[pos, styles.wall]} />);
    } else if (ch === "^") {
      // diken, bitişik duvarın tersine bakar
      let rot = "0deg";
      if (tileAt(lv, c, r + 1) === "#") rot = "0deg";
      else if (tileAt(lv, c, r - 1) === "#") rot = "180deg";
      else if (tileAt(lv, c - 1, r) === "#") rot = "90deg";
      else if (tileAt(lv, c + 1, r) === "#") rot = "-90deg";
      items.push(<View key={r + "-" + c} style={[pos, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ fontSize: tile * .95, lineHeight: tile * 1.05, color: "#ff5a4a", transform: [{ rotate: rot }] }}>▲</Text>
      </View>);
    } else if (ch === "G") {
      items.push(<View key={r + "-" + c} style={pos}><Goal tile={tile} /></View>);
    }
  }
  return <>{items}</>;
});

// ---------- Ana uygulama ----------
export default function App() {
  const { width, height } = useWindowDimensions();
  const [levelIndex, setLevelIndex] = useState(0);
  const [unlocked, setUnlocked] = useState(0);
  const [stars, setStars] = useState({});
  const [phase, setPhase] = useState("ready"); // ready | run | dead | won
  const [attempt, setAttempt] = useState(0);
  const [pos, setPos] = useState({ x: 0, y: 0, g: 0 });
  const [turns, setTurns] = useState(0);
  const [secs, setSecs] = useState(0);
  const [deaths, setDeaths] = useState(0);

  const level = LEVELS[levelIndex];
  const lv = useMemo(() => parseLevel(level.rows), [levelIndex]);
  const size = Math.max(200, Math.min(width - 24, height * 0.5, 420));
  const tile = size / lv.cols;

  const stateRef = useRef(newState(lv));
  const angleRef = useRef(0);
  const angle = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const deadTimer = useRef(null);

  function resetLevel(autoRun) {
    clearTimeout(deadTimer.current);
    stateRef.current = newState(lv);
    angleRef.current = 0;
    angle.stopAnimation(); angle.setValue(0);
    flash.setValue(0);
    setPos({ x: stateRef.current.x, y: stateRef.current.y, g: 0 });
    setTurns(0); setSecs(0);
    setPhase(autoRun ? "run" : "ready");
    setAttempt(a => a + 1);
  }
  useEffect(() => { setDeaths(0); resetLevel(false); }, [levelIndex]);

  // Oyun döngüsü: sabit adımlı fizik
  useEffect(() => {
    if (phase !== "run") return;
    let raf, last = null, acc = 0, alive = true;
    const tick = (t) => {
      if (!alive) return;
      if (last === null) last = t;
      acc += Math.min((t - last) / 1000, 0.05); last = t;
      let s = stateRef.current;
      while (acc >= DT && s.status === "run") { s = step(lv, s, DT); acc -= DT; }
      stateRef.current = s;
      setPos({ x: s.x, y: s.y, g: s.g });
      setSecs(Math.floor(s.frames / 6) / 10);
      if (s.status === "dead") {
        setDeaths(d => d + 1);
        flash.setValue(1);
        Animated.timing(flash, { toValue: 0, duration: 600, useNativeDriver: true }).start();
        setPhase("dead");
        deadTimer.current = setTimeout(() => resetLevel(true), 650);
        return;
      }
      if (s.status === "won") {
        const t2 = s.turns, par = level.par;
        const st = t2 <= par ? 3 : t2 <= par + 2 ? 2 : 1;
        setStars(o => ({ ...o, [levelIndex]: Math.max(o[levelIndex] || 0, st) }));
        setUnlocked(u => Math.max(u, Math.min(levelIndex + 1, LEVELS.length - 1)));
        setPhase("won");
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [phase, attempt, levelIndex]);

  function onTap(dir) { // dir: +1 sol dokunuş, -1 sağ dokunuş
    if (phase === "ready") { setPhase("run"); return; }
    if (phase !== "run") return;
    stateRef.current = rotate(stateRef.current, dir);
    setTurns(stateRef.current.turns);
    angleRef.current += dir === 1 ? -90 : 90; // sol: dünya sola, sağ: dünya sağa döner
    Animated.spring(angle, { toValue: angleRef.current, friction: 6, tension: 95, useNativeDriver: true }).start();
  }

  const rot = angle.interpolate({ inputRange: [0, 360], outputRange: ["0deg", "360deg"] });
  const fd = D[(pos.g + 3) % 4];
  const ps = PS * tile;
  const earOff = ps * 0.22;
  const starCount = stars[levelIndex] || 0;
  const lastLevel = levelIndex === LEVELS.length - 1;

  return <SafeAreaView style={styles.safe}>
    <StatusBar barStyle="light-content" />
    <View style={styles.header}>
      <View>
        <Text style={styles.eyebrow}>YERÇEKİMİ PARKURU</Text>
        <Text style={styles.title}>DÖNEN DÜNYA</Text>
      </View>
      <Pressable onPress={() => resetLevel(false)} style={styles.restart}><Text style={styles.restartText}>↻ Baştan</Text></Pressable>
    </View>

    <View style={styles.chips}>
      {LEVELS.map((L, i) => {
        const locked = i > unlocked, active = i === levelIndex;
        return <Pressable key={i} disabled={locked} onPress={() => setLevelIndex(i)}
          style={[styles.chip, active && styles.chipActive, locked && styles.chipLocked]}>
          <Text style={[styles.chipText, active && styles.chipTextActive]}>{locked ? "🔒" : i + 1}</Text>
          {!locked && !!stars[i] && <Text style={styles.chipStars}>{"★".repeat(stars[i])}</Text>}
        </Pressable>;
      })}
    </View>

    <View style={styles.statRow}>
      <View style={styles.stat}><Text style={styles.statLabel}>BÖLÜM</Text><Text style={styles.statValue}>{levelIndex + 1} • {level.name}</Text></View>
      <View style={styles.stat}><Text style={styles.statLabel}>DÖNÜŞ</Text><Text style={styles.statValue}>{turns} <Text style={styles.statSub}>/ par {level.par}</Text></Text></View>
      <View style={styles.stat}><Text style={styles.statLabel}>SÜRE</Text><Text style={styles.statValue}>{secs.toFixed(1)}s</Text></View>
    </View>

    <View style={{ alignItems: "center", marginTop: 10 }}>
      <View style={[styles.boardFrame, { width: size + 12, height: size + 12 }]}>
        <View style={{ width: size, height: size, overflow: "hidden", borderRadius: 6, backgroundColor: "#0f1d19" }}>
          <Animated.View style={{ width: size, height: size, transform: [{ rotate: rot }] }}>
            <LevelView lv={lv} tile={tile} />
            <View pointerEvents="none" style={[styles.player, {
              left: (pos.x - PS / 2) * tile, top: (pos.y - PS / 2) * tile, width: ps, height: ps, borderRadius: ps * .28,
              opacity: phase === "dead" ? 0.25 : 1
            }]}>
              <View style={[styles.eye, { width: ps * .2, height: ps * .2, borderRadius: ps, left: ps / 2 - ps * .1 + fd[0] * earOff - fd[1] * ps * .14, top: ps / 2 - ps * .1 + fd[1] * earOff + fd[0] * ps * .14 }]} />
              <View style={[styles.eye, { width: ps * .2, height: ps * .2, borderRadius: ps, left: ps / 2 - ps * .1 + fd[0] * earOff + fd[1] * ps * .14, top: ps / 2 - ps * .1 + fd[1] * earOff - fd[0] * ps * .14 }]} />
            </View>
          </Animated.View>
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "#ff3b2f", opacity: flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] }) }]} />

          {/* Dokunma bölgeleri: sol yarı / sağ yarı */}
          <View style={StyleSheet.absoluteFill}>
            <View style={{ flex: 1, flexDirection: "row" }}>
              <Pressable style={styles.zone} onPressIn={() => onTap(1)}>{phase !== "won" && <Text style={styles.zoneHint}>⟲</Text>}</Pressable>
              <Pressable style={styles.zone} onPressIn={() => onTap(-1)}>{phase !== "won" && <Text style={styles.zoneHint}>⟳</Text>}</Pressable>
            </View>
          </View>

          {phase === "ready" && <View pointerEvents="none" style={styles.overlay}>
            <Text style={styles.overlayTitle}>DOKUN VE KOŞ</Text>
            <Text style={styles.overlayText}>{level.hint}</Text>
          </View>}

          {phase === "won" && <View style={styles.overlay}>
            <Text style={styles.winEmoji}>🏁</Text>
            <Text style={styles.overlayTitle}>{lastLevel ? "HEPSİNİ BİTİRDİN!" : "BÖLÜM TAMAM"}</Text>
            <Text style={styles.stars}>{"★".repeat(starCount)}<Text style={{ color: "#3b4d45" }}>{"★".repeat(3 - starCount)}</Text></Text>
            <Text style={styles.overlayText}>{turns} dönüş • {secs.toFixed(1)} sn{deaths ? " • " + deaths + " ölüm" : ""}</Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <Pressable onPress={() => resetLevel(false)} style={styles.btnGhost}><Text style={styles.btnGhostText}>↻ Tekrar</Text></Pressable>
              <Pressable onPress={() => setLevelIndex(lastLevel ? 0 : levelIndex + 1)} style={styles.btn}><Text style={styles.btnText}>{lastLevel ? "Başa dön" : "Sonraki ▶"}</Text></Pressable>
            </View>
          </View>}
        </View>
      </View>
    </View>

    <Text style={styles.footer}>Sol yarıya dokun: dünya sola döner • Sağ yarıya dokun: dünya sağa döner</Text>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0b1512" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 10 },
  eyebrow: { fontSize: 9, letterSpacing: 3, color: "#c8a65b", fontWeight: "800" },
  title: { fontSize: 24, fontWeight: "900", letterSpacing: 1.5, color: "#f4ead5", marginTop: 3 },
  restart: { backgroundColor: "#c49b4a", paddingVertical: 9, paddingHorizontal: 13, borderRadius: 12 },
  restartText: { color: "#17231d", fontWeight: "900", fontSize: 12 },
  chips: { flexDirection: "row", gap: 6, paddingHorizontal: 16, marginTop: 12, flexWrap: "wrap" },
  chip: { minWidth: 38, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 10, backgroundColor: "#16271f", borderWidth: 1, borderColor: "#2e4438", alignItems: "center" },
  chipActive: { backgroundColor: "#c49b4a", borderColor: "#e4c77f" },
  chipLocked: { opacity: .5 },
  chipText: { color: "#d2d9cd", fontWeight: "800", fontSize: 12 },
  chipTextActive: { color: "#17231d" },
  chipStars: { color: "#ffd86b", fontSize: 7, marginTop: -1 },
  statRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginTop: 12 },
  stat: { flex: 1, backgroundColor: "#13241d", borderRadius: 12, borderWidth: 1, borderColor: "#2a4036", padding: 9 },
  statLabel: { fontSize: 8, color: "#a9b5a8", fontWeight: "800", letterSpacing: 1 },
  statValue: { fontSize: 14, color: "#f2e5c0", fontWeight: "900", marginTop: 3 },
  statSub: { fontSize: 10, color: "#8fa093", fontWeight: "700" },
  boardFrame: { backgroundColor: "#2a1f14", borderRadius: 14, borderWidth: 3, borderColor: "#b98a42", padding: 3, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: .5, shadowRadius: 14, elevation: 10 },
  wall: { backgroundColor: "#2f4f42", borderWidth: 1, borderTopColor: "#4c7a66", borderLeftColor: "#3e6554", borderBottomColor: "#1d332a", borderRightColor: "#22392f", borderRadius: 3 },
  goalOuter: { borderWidth: 2, borderColor: "#5dffb0", alignItems: "center", justifyContent: "center", shadowColor: "#5dffb0", shadowOpacity: 1, shadowRadius: 10 },
  goalInner: { backgroundColor: "#5dffb0" },
  player: { position: "absolute", backgroundColor: "#ffb347", borderWidth: 2, borderColor: "#ffd98a", shadowColor: "#ffb347", shadowOpacity: .9, shadowRadius: 8 },
  eye: { position: "absolute", backgroundColor: "#2b1a05" },
  zone: { flex: 1, alignItems: "center", justifyContent: "flex-end", paddingBottom: 8 },
  zoneHint: { color: "rgba(255,255,255,.10)", fontSize: 34, fontWeight: "900" },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(8,16,13,.78)", alignItems: "center", justifyContent: "center", padding: 20 },
  overlayTitle: { color: "#ffe9a8", fontSize: 22, fontWeight: "900", letterSpacing: 1.5, textAlign: "center" },
  overlayText: { color: "#d3d9ce", fontSize: 12, marginTop: 8, textAlign: "center", lineHeight: 18 },
  winEmoji: { fontSize: 38, marginBottom: 4 },
  stars: { color: "#ffd86b", fontSize: 30, marginTop: 6, letterSpacing: 4 },
  btn: { backgroundColor: "#c49b4a", paddingVertical: 11, paddingHorizontal: 18, borderRadius: 12 },
  btnText: { color: "#17231d", fontWeight: "900", fontSize: 13 },
  btnGhost: { borderWidth: 1.5, borderColor: "#c49b4a", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
  btnGhostText: { color: "#e4c77f", fontWeight: "900", fontSize: 13 },
  footer: { textAlign: "center", fontSize: 10, color: "#718477", marginTop: 14, paddingHorizontal: 16, lineHeight: 15 }
});
