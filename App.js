import React, { useEffect, useMemo, useRef, useState, memo } from "react";
import {
  View, Text, Pressable, StyleSheet, SafeAreaView, StatusBar,
  Animated, Easing, useWindowDimensions
} from "react-native";
import { D, PS, DT, parseLevel, tileAt, newState, rotate, step, doorOpenAt } from "./engine";
import { LEVELS } from "./levels";
import { playSfx } from "./sound";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Her bölümün kendi neon rengi
const ACCENTS = ["#35e0b5", "#ff7ac6", "#7aa8ff", "#ffc857", "#b388ff", "#ff8a5b", "#5dffb0", "#ff5a7a"];
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return "rgba(" + (n >> 16) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")"; };
const CONFETTI = ["#ffd86b", "#ff6b6b", "#6bd6ff", "#9bff8f", "#ff9bf0", "#ffffff"];

// ---------- Karakterler (yıldızla açılır) ----------
const CHARACTERS = [
  { id: "turuncu", name: "Turuncu", cost: 0, body: "#ffa733", border: "#ffd98a", glow: "#ffa733", trail: "#ffb347", radius: .3, eyes: "round" },
  { id: "buz", name: "Buz", cost: 3, body: "#6ad7ff", border: "#d2f4ff", glow: "#6ad7ff", trail: "#9be6ff", radius: .14, eyes: "round" },
  { id: "slime", name: "Zıp Zıp", cost: 6, body: "#ff7ac6", border: "#ffc2e6", glow: "#ff7ac6", trail: "#ff9bd5", radius: .5, eyes: "dot" },
  { id: "kedi", name: "Kedi", cost: 10, body: "#a9b4d6", border: "#e1e7fb", glow: "#a9b4d6", trail: "#c3cbe6", radius: .3, eyes: "round", extra: "ears" },
  { id: "robot", name: "Robot", cost: 15, body: "#5dffb0", border: "#c4ffe5", glow: "#5dffb0", trail: "#8bffc8", radius: .16, eyes: "visor", extra: "antenna" },
  { id: "altin", name: "Altın", cost: 20, body: "#ffd84a", border: "#fff0a8", glow: "#ffd84a", trail: "#ffe27a", radius: .3, eyes: "round", extra: "crown" },
  { id: "golge", name: "Gölge", cost: 26, body: "#161b2b", border: "#7aa8ff", glow: "#7aa8ff", trail: "#7aa8ff", radius: .3, eyes: "glow" }
];
const STORE_KEY = "donen-dunya-v1";

// Karakter çizimi: g = yerçekimi yönü (0-3), fd = ileri yön. Dünya döndüğü için "yukarı" = yerçekiminin tersi.
function Hero({ ps, ch, g = 0, dead }) {
  const gd = D[g], fd = D[(g + 3) % 4], up = [-gd[0], -gd[1]];
  const at = (u, f, size) => ({ position: "absolute", left: ps / 2 + up[0] * u + fd[0] * f - size / 2, top: ps / 2 + up[1] * u + fd[1] * f - size / 2 });
  const eyeSize = ps * .27, pupil = ps * .13;
  const eyePos = (sd) => ({ position: "absolute", left: ps / 2 + fd[0] * ps * .2 + (sd * -fd[1]) * ps * .2 - eyeSize / 2, top: ps / 2 + fd[1] * ps * .2 + (sd * fd[0]) * ps * .2 - eyeSize / 2 });
  const vertical = up[1] !== 0; // yukarı yön dikeyse çubuklar dikey durur
  const diamond = (u, f, size, color) => <View key={u + "," + f} style={[at(u, f, size), { width: size, height: size, backgroundColor: color, borderWidth: 1.5, borderColor: ch.border, transform: [{ rotate: "45deg" }] }]} />;
  return <View style={{ width: ps, height: ps, borderRadius: ps * ch.radius, backgroundColor: ch.body, borderWidth: 2, borderColor: ch.border, shadowColor: ch.glow, shadowOpacity: 1, shadowRadius: 10, opacity: dead ? .2 : 1 }}>
    <View style={{ position: "absolute", left: ps * .1, top: ps * .08, width: ps * .45, height: ps * .2, borderRadius: ps, backgroundColor: "rgba(255,255,255,.3)" }} />
    {ch.extra === "ears" && [-1, 1].map(sd => diamond(ps * .5, sd * ps * .26, ps * .26, ch.body))}
    {ch.extra === "antenna" && <>
      <View style={[at(ps * .6, 0, ps * .2), { width: vertical ? 2 : ps * .2, height: vertical ? ps * .2 : 2, backgroundColor: ch.border }]} />
      <View style={[at(ps * .74, 0, ps * .16), { width: ps * .16, height: ps * .16, borderRadius: ps, backgroundColor: "#ff5a7a", shadowColor: "#ff5a7a", shadowOpacity: 1, shadowRadius: 6 }]} />
    </>}
    {ch.extra === "crown" && [-1, 0, 1].map(k => diamond(ps * (k === 0 ? .62 : .54), k * ps * .24, k === 0 ? ps * .26 : ps * .2, "#ff4d6d"))}
    {ch.eyes === "visor" ? (() => {
      const vw = vertical ? ps * .2 : ps * .52, vh = vertical ? ps * .52 : ps * .2; // ileri yöne dik, uzun bir vizör
      return <View style={{ position: "absolute", left: ps / 2 + fd[0] * ps * .2 - vw / 2, top: ps / 2 + fd[1] * ps * .2 - vh / 2, width: vw, height: vh, borderRadius: ps * .1, backgroundColor: "#0b2a20" }}>
        <View style={{ position: "absolute", left: "14%", top: "14%", right: "14%", bottom: "14%", borderRadius: ps * .08, backgroundColor: "#7dffd0" }} />
      </View>;
    })()
    : [-1, 1].map(sd => ch.eyes === "round" ? (
      <View key={sd} style={[eyePos(sd), { width: eyeSize, height: eyeSize, borderRadius: eyeSize, backgroundColor: "#fff", overflow: "hidden" }]}>
        <View style={{ position: "absolute", width: pupil, height: pupil, borderRadius: pupil, backgroundColor: "#2b1a05", left: eyeSize / 2 - pupil / 2 + fd[0] * eyeSize * .18, top: eyeSize / 2 - pupil / 2 + fd[1] * eyeSize * .18 }} />
      </View>) : ch.eyes === "dot" ? (
      <View key={sd} style={[eyePos(sd), { width: ps * .15, height: ps * .15, borderRadius: ps, backgroundColor: "#3a0f2a" }]} />
      ) : (
      <View key={sd} style={[eyePos(sd), { width: ps * .2, height: ps * .2, borderRadius: ps, backgroundColor: "#8be9ff", shadowColor: "#8be9ff", shadowOpacity: 1, shadowRadius: 6 }]} />
    ))}
  </View>;
}

// ---------- Hedef (nabız gibi atan portal) ----------
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
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [.85, 1.18] });
  const fade = pulse.interpolate({ inputRange: [0, 1], outputRange: [.9, .35] });
  return <View style={{ width: tile, height: tile, alignItems: "center", justifyContent: "center" }}>
    <Animated.View style={{ position: "absolute", width: tile * .95, height: tile * .95, borderRadius: tile, backgroundColor: "rgba(93,255,176,.18)", opacity: fade, transform: [{ scale }] }} />
    <Animated.View style={[styles.goalOuter, { width: tile * .7, height: tile * .7, borderRadius: tile, transform: [{ scale }] }]}>
      <View style={{ width: tile * .3, height: tile * .3, borderRadius: tile, backgroundColor: "#5dffb0" }} />
    </Animated.View>
  </View>;
}

// ---------- Bölüm görünümü (yalnızca bölüm değişince çizilir) ----------
const LevelView = memo(function LevelView({ lv, tile, accent }) {
  const items = [];
  const t = Math.max(2, tile * .09);
  const isWall = (c, r) => tileAt(lv, c, r) === "#";
  for (let r = 0; r < lv.rows; r++) for (let c = 0; c < lv.cols; c++) {
    const ch = lv.cells[r][c];
    const pos = { position: "absolute", left: c * tile, top: r * tile, width: tile, height: tile };
    const key = r + "-" + c;
    if (ch === "#") {
      // Duvar: koyu dolgu + sadece boşluğa bakan kenarlarda parlayan neon çizgi
      items.push(<View key={key} style={[pos, {
        backgroundColor: rgba(accent, .09),
        borderTopWidth: isWall(c, r - 1) ? 0 : t, borderTopColor: accent,
        borderBottomWidth: isWall(c, r + 1) ? 0 : t, borderBottomColor: accent,
        borderLeftWidth: isWall(c - 1, r) ? 0 : t, borderLeftColor: accent,
        borderRightWidth: isWall(c + 1, r) ? 0 : t, borderRightColor: accent
      }]} />);
    } else if (ch === " " || ch === "B" || ch === "D") {
      items.push(<View key={key} pointerEvents="none" style={[pos, { alignItems: "center", justifyContent: "center" }]}>
        <View style={{ width: tile * .08, height: tile * .08, borderRadius: tile, backgroundColor: rgba(accent, .16) }} />
      </View>);
    } else if (ch === "^") {
      let rot = "0deg";
      if (isWall(c, r + 1)) rot = "0deg";
      else if (isWall(c, r - 1)) rot = "180deg";
      else if (isWall(c - 1, r)) rot = "90deg";
      else if (isWall(c + 1, r)) rot = "-90deg";
      items.push(<View key={key} style={[pos, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ fontSize: tile * .95, lineHeight: tile * 1.05, color: "#ff4d3d", textShadowColor: "#ff2a1a", textShadowRadius: 10, textShadowOffset: { width: 0, height: 0 }, transform: [{ rotate: rot }] }}>▲</Text>
      </View>);
    } else if (ch === "G") {
      items.push(<View key={key} style={pos}><Goal tile={tile} /></View>);
    }
  }
  return <>{items}</>;
});

// ---------- Kapılar ve düğmeler (durumu değiştiği için ayrı katman) ----------
const DOOR = "#e055ff";
const DoorsButtons = memo(function DoorsButtons({ lv, tile, open, lit }) {
  const items = [];
  const t = Math.max(2, tile * .09);
  const isDoor = (c, r) => tileAt(lv, c, r) === "D";
  for (let r = 0; r < lv.rows; r++) for (let c = 0; c < lv.cols; c++) {
    const ch = lv.cells[r][c];
    const pos = { position: "absolute", left: c * tile, top: r * tile, width: tile, height: tile };
    const key = "x" + r + "-" + c;
    if (ch === "D") {
      items.push(<View key={key} pointerEvents="none" style={[pos, {
        backgroundColor: open ? "rgba(224,85,255,.04)" : "rgba(224,85,255,.30)",
        borderStyle: open ? "dashed" : "solid",
        borderTopWidth: isDoor(c, r - 1) ? 0 : t, borderBottomWidth: isDoor(c, r + 1) ? 0 : t,
        borderLeftWidth: isDoor(c - 1, r) ? 0 : t, borderRightWidth: isDoor(c + 1, r) ? 0 : t,
        borderColor: open ? "rgba(224,85,255,.35)" : DOOR
      }]} />);
    } else if (ch === "B") {
      const on = lit.split("|").includes(c + "," + r);
      items.push(<View key={key} pointerEvents="none" style={[pos, { alignItems: "center", justifyContent: "center" }]}>
        <View style={{ width: tile * .7, height: tile * .7, borderRadius: tile, borderWidth: 2, borderColor: "#ffe066", alignItems: "center", justifyContent: "center", backgroundColor: on ? "rgba(255,224,102,.45)" : "rgba(255,224,102,.08)", shadowColor: "#ffe066", shadowOpacity: on ? 1 : .4, shadowRadius: on ? 12 : 4 }}>
          <View style={{ width: tile * .28, height: tile * .28, borderRadius: tile, backgroundColor: on ? "#ffe066" : "rgba(255,224,102,.5)" }} />
        </View>
      </View>);
    }
  }
  return <>{items}</>;
});

// ---------- Konfeti ----------
function Confetti({ w, h }) {
  const parts = useRef(Array.from({ length: 30 }, (_, i) => ({
    x: Math.random() * Math.max(w - 10, 1), size: 5 + Math.random() * 6, delay: Math.random() * 1400, dur: 2000 + Math.random() * 1600,
    color: CONFETTI[i % CONFETTI.length], spin: Math.random() > .5 ? 1 : -1, v: new Animated.Value(0)
  }))).current;
  useEffect(() => {
    const anims = parts.map(p => Animated.loop(Animated.timing(p.v, { toValue: 1, duration: p.dur, delay: p.delay, easing: Easing.linear, useNativeDriver: true })));
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>{parts.map((p, i) =>
    <Animated.View key={i} style={{
      position: "absolute", left: p.x, top: -20, width: p.size, height: p.size * 1.6, backgroundColor: p.color, borderRadius: 2,
      transform: [
        { translateY: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, h + 40] }) },
        { translateX: p.v.interpolate({ inputRange: [0, .5, 1], outputRange: [0, 14 * p.spin, -14 * p.spin] }) },
        { rotate: p.v.interpolate({ inputRange: [0, 1], outputRange: ["0deg", (p.spin * 720) + "deg"] }) }
      ]
    }} />)}</View>;
}

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
  const [soundOn, setSoundOn] = useState(true);
  const [runCount, setRunCount] = useState(0);   // kaydedilmiş hayalet sayısı
  const [notice, setNotice] = useState("");
  const [heroId, setHeroId] = useState("turuncu");
  const [picker, setPicker] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [unlockMsg, setUnlockMsg] = useState("");
  const starsRef = useRef({});

  const level = LEVELS[levelIndex];
  const accent = ACCENTS[levelIndex % ACCENTS.length];
  const lv = useMemo(() => parseLevel(level.rows), [levelIndex]);
  const size = Math.max(220, Math.min(width - 28, height * 0.5, 420));
  const tile = size / lv.cols;

  const stateRef = useRef(newState(lv));
  const trailRef = useRef([]);
  const runsRef = useRef([]);      // hayaletler: [{path:[{x,y}], button}]
  const recRef = useRef([]);       // şu anki koşunun kaydı
  const baseTurnsRef = useRef(0);  // önceki koşularda yapılan dönüşler
  const angleRef = useRef(0);
  const soundRef = useRef(true);
  const angle = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const deadTimer = useRef(null);
  const sfx = n => { if (soundRef.current) playSfx(n); };

  // Kayıt: yıldızlar, açılan bölümler, seçilen karakter
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORE_KEY);
        if (raw) {
          const d = JSON.parse(raw);
          if (d.stars) { setStars(d.stars); starsRef.current = d.stars; }
          if (typeof d.unlocked === "number") setUnlocked(Math.min(d.unlocked, LEVELS.length - 1));
          if (d.heroId && CHARACTERS.some(c => c.id === d.heroId)) setHeroId(d.heroId);
          if (d.sound === false) { soundRef.current = false; setSoundOn(false); }
        }
      } catch (e) {}
      setLoaded(true);
    })();
  }, []);
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORE_KEY, JSON.stringify({ stars, unlocked, heroId, sound: soundOn })).catch(() => {});
  }, [stars, unlocked, heroId, soundOn, loaded]);

  // Arka plandaki sabit yıldızlar (dünya dönerken yerinde kalır, derinlik hissi verir)
  const stars2 = useMemo(() => {
    let seed = 7 + levelIndex * 13;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    return Array.from({ length: 34 }, () => ({ x: rnd() * size, y: rnd() * size, s: 1 + rnd() * 2.2, o: .15 + rnd() * .45 }));
  }, [levelIndex, size]);

  function resetLevel(autoRun, keepRuns) {
    clearTimeout(deadTimer.current);
    if (!keepRuns) { runsRef.current = []; baseTurnsRef.current = 0; setRunCount(0); setNotice(""); }
    stateRef.current = newState(lv);
    recRef.current = [{ x: stateRef.current.x, y: stateRef.current.y }];
    trailRef.current = [];
    angleRef.current = 0;
    angle.stopAnimation(); angle.setValue(0);
    flash.setValue(0); shake.setValue(0); setUnlockMsg("");
    setPos({ x: stateRef.current.x, y: stateRef.current.y, g: 0 });
    setTurns(0); setSecs(0);
    setPhase(autoRun ? "run" : "ready");
    setAttempt(a => a + 1);
  }
  useEffect(() => { setDeaths(0); resetLevel(false); }, [levelIndex]);
  useEffect(() => () => clearTimeout(deadTimer.current), []);

  // Oyun döngüsü: sabit adımlı fizik
  useEffect(() => {
    if (phase !== "run") return;
    let raf, last = null, acc = 0, alive = true, n = 0;
    const tick = (t) => {
      if (!alive) return;
      if (last === null) last = t;
      acc += Math.min((t - last) / 1000, 0.05); last = t;
      let s = stateRef.current;
      while (acc >= DT && s.status === "run") {
        const runs = runsRef.current;
        s = step(lv, s, DT, { doorOpen: doorOpenAt(lv, runs, s.frames), held: runs.map(r => r.button) });
        recRef.current.push({ x: s.x, y: s.y });
        acc -= DT;
      }
      stateRef.current = s;
      if ((n++ % 2) === 0) { const tr = trailRef.current; tr.push({ x: s.x, y: s.y }); if (tr.length > 9) tr.shift(); }
      setPos({ x: s.x, y: s.y, g: s.g });
      setSecs(Math.floor(s.frames / 6) / 10);
      if (s.status === "dead") {
        sfx("die");
        setDeaths(d => d + 1);
        flash.setValue(1);
        Animated.timing(flash, { toValue: 0, duration: 600, useNativeDriver: true }).start();
        Animated.sequence([-9, 9, -6, 6, -3, 0].map(v => Animated.timing(shake, { toValue: v, duration: 50, useNativeDriver: true }))).start();
        setPhase("dead");
        deadTimer.current = setTimeout(() => resetLevel(true, true), 700);
        return;
      }
      if (s.status === "button") {
        // Bu koşu bir düğmede bitti: kaydı hayalet olarak sakla, aynı bölümü yeniden başlat
        sfx("record");
        runsRef.current = [...runsRef.current, { path: recRef.current, button: s.button }];
        baseTurnsRef.current += s.turns;
        setRunCount(runsRef.current.length);
        const left = lv.buttons.length - runsRef.current.length;
        setNotice(left > 0 ? "👻 Hayalet kaydedildi! Şimdi sıradaki düğmeye var." : "👻 Hayalet düğmede bekliyor. Şimdi sen koş, kapı onunla açılacak!");
        resetLevel(false, true);
        return;
      }
      if (s.status === "won") {
        sfx("win");
        const par = level.par, total = baseTurnsRef.current + s.turns;
        const st = total <= par ? 3 : total <= par + 2 ? 2 : 1;
        const before = Object.values(starsRef.current).reduce((a, b) => a + b, 0);
        const next = { ...starsRef.current, [levelIndex]: Math.max(starsRef.current[levelIndex] || 0, st) };
        starsRef.current = next;
        const after = Object.values(next).reduce((a, b) => a + b, 0);
        const fresh = CHARACTERS.filter(c => c.cost > before && c.cost <= after);
        setUnlockMsg(fresh.length ? "🎉 Yeni karakter açıldı: " + fresh.map(c => c.name).join(", ") + "!" : "");
        setStars(next);
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
    if (phase === "ready") { sfx("tick"); setPhase("run"); return; }
    if (phase !== "run") return;
    sfx("rotate");
    stateRef.current = rotate(stateRef.current, dir);
    setTurns(stateRef.current.turns);
    angleRef.current += dir === 1 ? -90 : 90; // sol: dünya sola, sağ: dünya sağa döner
    Animated.spring(angle, { toValue: angleRef.current, friction: 6, tension: 95, useNativeDriver: true }).start();
  }
  function toggleSound() { const next = !soundOn; soundRef.current = next; setSoundOn(next); if (next) playSfx("tick"); }

  const rot = angle.interpolate({ inputRange: [0, 360], outputRange: ["0deg", "360deg"] });
  const hero = CHARACTERS.find(c => c.id === heroId) || CHARACTERS[0];
  const totalStars = Object.values(stars).reduce((a, b) => a + b, 0);
  const ps = PS * tile;
  const starCount = stars[levelIndex] || 0;
  const lastLevel = levelIndex === LEVELS.length - 1;
  const trail = trailRef.current;
  const runs = runsRef.current;
  const frames = stateRef.current.frames;
  const open = doorOpenAt(lv, runs, frames);
  const lit = runs.filter(r => frames >= r.path.length - 1).map(r => r.button).join("|");
  const isGhostLevel = lv.buttons.length > 0;
  const shownTurns = baseTurnsRef.current + turns;

  return <SafeAreaView style={styles.safe}>
    <StatusBar barStyle="light-content" />
    {/* arka plan ışıkları */}
    <View pointerEvents="none" style={[styles.blob, { top: -90, right: -70, width: 260, height: 260, backgroundColor: rgba(accent, .10) }]} />
    <View pointerEvents="none" style={[styles.blob, { bottom: -110, left: -90, width: 300, height: 300, backgroundColor: rgba(accent, .07) }]} />

    <View style={styles.header}>
      <View>
        <Text style={[styles.eyebrow, { color: accent }]}>YERÇEKİMİ PARKURU</Text>
        <Text style={styles.title}>DÖNEN DÜNYA</Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={() => setPicker(true)} style={styles.iconBtn}><Text style={{ fontSize: 16 }}>🎨</Text></Pressable>
        <Pressable onPress={toggleSound} style={styles.iconBtn}><Text style={{ fontSize: 16 }}>{soundOn ? "🔊" : "🔇"}</Text></Pressable>
        <Pressable onPress={() => resetLevel(false)} style={[styles.restart, { backgroundColor: accent }]}><Text style={styles.restartText}>↻ Baştan</Text></Pressable>
      </View>
    </View>

    <View style={styles.chips}>
      {LEVELS.map((L, i) => {
        const locked = i > unlocked, active = i === levelIndex, a = ACCENTS[i % ACCENTS.length];
        return <Pressable key={i} disabled={locked} onPress={() => setLevelIndex(i)}
          style={[styles.chip, active && { backgroundColor: a, borderColor: a }, locked && styles.chipLocked]}>
          <Text style={[styles.chipText, active && { color: "#0b1512" }]}>{locked ? "🔒" : i + 1}</Text>
          {!locked && !!stars[i] && <Text style={[styles.chipStars, active && { color: "#0b1512" }]}>{"★".repeat(stars[i])}</Text>}
        </Pressable>;
      })}
    </View>

    <View style={styles.statRow}>
      <View style={styles.stat}><Text style={styles.statLabel}>BÖLÜM</Text><Text style={styles.statValue} numberOfLines={1}>{levelIndex + 1} • {level.name}</Text></View>
      <View style={styles.stat}><Text style={styles.statLabel}>DÖNÜŞ</Text><Text style={styles.statValue}>{shownTurns} <Text style={styles.statSub}>/ par {level.par}</Text></Text></View>
      <View style={styles.stat}><Text style={styles.statLabel}>SÜRE</Text><Text style={styles.statValue}>{secs.toFixed(1)}s</Text></View>
      {isGhostLevel && <View style={styles.stat}><Text style={styles.statLabel}>KOŞU</Text><Text style={styles.statValue}>👻 {Math.min(runCount + 1, lv.buttons.length + 1)}/{lv.buttons.length + 1}</Text></View>}
    </View>

    <View style={{ alignItems: "center", marginTop: 12 }}>
      <Animated.View style={[styles.boardFrame, { width: size + 14, height: size + 14, borderColor: accent, shadowColor: accent, transform: [{ translateX: shake }] }]}>
        <View style={{ width: size, height: size, overflow: "hidden", borderRadius: 8, backgroundColor: "#081210" }}>
          {/* sabit yıldızlar */}
          {stars2.map((s, i) => <View key={i} pointerEvents="none" style={{ position: "absolute", left: s.x, top: s.y, width: s.s, height: s.s, borderRadius: s.s, backgroundColor: "#fff", opacity: s.o }} />)}

          <Animated.View style={{ width: size, height: size, transform: [{ rotate: rot }] }}>
            <LevelView lv={lv} tile={tile} accent={accent} />
            <DoorsButtons lv={lv} tile={tile} open={open} lit={lit} />
            {/* hayaletler: önceki koşuların kaydını oynatır */}
            {runs.map((g, gi) => {
              const f = Math.min(frames, g.path.length - 1), gp = g.path[f];
              return <View key={"g" + gi} pointerEvents="none" style={{ position: "absolute", left: (gp.x - PS / 2) * tile, top: (gp.y - PS / 2) * tile, width: ps, height: ps, borderRadius: ps * .3, backgroundColor: "rgba(160,235,255,.40)", borderWidth: 2, borderColor: "rgba(200,245,255,.85)", shadowColor: "#8be9ff", shadowOpacity: .9, shadowRadius: 10, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: ps * .55 }}>👻</Text>
              </View>;
            })}
            {/* iz */}
            {trail.map((p, i) => {
              const k = (i + 1) / trail.length, sz = ps * (.25 + .55 * k);
              return <View key={i} pointerEvents="none" style={{ position: "absolute", left: p.x * tile - sz / 2, top: p.y * tile - sz / 2, width: sz, height: sz, borderRadius: sz * .3, backgroundColor: hero.trail, opacity: .05 + .28 * k }} />;
            })}
            {/* oyuncu */}
            <View pointerEvents="none" style={{ position: "absolute", left: (pos.x - PS / 2) * tile, top: (pos.y - PS / 2) * tile, width: ps, height: ps }}>
              <Hero ps={ps} ch={hero} g={pos.g} dead={phase === "dead"} />
            </View>
          </Animated.View>
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "#ff3b2f", opacity: flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] }) }]} />

          {/* Dokunma bölgeleri */}
          <View style={StyleSheet.absoluteFill}>
            <View style={{ flex: 1, flexDirection: "row" }}>
              <Pressable style={styles.zone} onPressIn={() => onTap(1)}>{phase !== "won" && <Text style={styles.zoneHint}>⟲</Text>}</Pressable>
              <Pressable style={styles.zone} onPressIn={() => onTap(-1)}>{phase !== "won" && <Text style={styles.zoneHint}>⟳</Text>}</Pressable>
            </View>
          </View>

          {phase === "ready" && <View pointerEvents="none" style={styles.overlay}>
            <Text style={[styles.overlayTitle, { color: accent }]}>DOKUN VE KOŞ</Text>
            <Text style={styles.overlayText}>{runCount > 0 ? notice : level.hint}</Text>
          </View>}

          {phase === "won" && <View pointerEvents="box-none" style={styles.winOverlay}>
            <Text style={styles.winEmoji}>🏁</Text>
            <Text style={styles.overlayTitle}>{lastLevel ? "HEPSİNİ BİTİRDİN!" : "BÖLÜM TAMAM"}</Text>
            <Text style={styles.stars}>{"★".repeat(starCount)}<Text style={{ color: "#3b4d45" }}>{"★".repeat(3 - starCount)}</Text></Text>
            {!!unlockMsg && <Text style={[styles.overlayText, { color: "#ffd86b", fontWeight: "900" }]}>{unlockMsg}</Text>}
            <Text style={styles.overlayText}>{shownTurns} dönüş • {secs.toFixed(1)} sn{deaths ? " • " + deaths + " ölüm" : ""}</Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <Pressable onPress={() => resetLevel(false)} style={[styles.btnGhost, { borderColor: accent }]}><Text style={[styles.btnGhostText, { color: accent }]}>↻ Tekrar</Text></Pressable>
              <Pressable onPress={() => setLevelIndex(lastLevel ? 0 : levelIndex + 1)} style={[styles.btn, { backgroundColor: accent }]}><Text style={styles.btnText}>{lastLevel ? "Başa dön" : "Sonraki ▶"}</Text></Pressable>
            </View>
          </View>}

          {phase === "won" && <Confetti w={size} h={size} />}
        </View>
      </Animated.View>
    </View>

    {picker && <View style={styles.pickerWrap}>
      <View style={styles.picker}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={[styles.eyebrow, { color: accent }]}>KARAKTER SEÇ</Text>
            <Text style={styles.pickerTitle}>⭐ {totalStars} yıldız</Text>
          </View>
          <Pressable onPress={() => setPicker(false)} style={styles.iconBtn}><Text style={{ color: "#fff", fontWeight: "900" }}>✕</Text></Pressable>
        </View>
        <View style={styles.pickerGrid}>
          {CHARACTERS.map(c => {
            const locked = c.cost > totalStars, sel = c.id === heroId;
            return <Pressable key={c.id} disabled={locked} onPress={() => { setHeroId(c.id); sfx("tick"); }}
              style={[styles.card, sel && { borderColor: accent, backgroundColor: rgba(accent, .12) }, locked && { opacity: .55 }]}>
              <View style={{ height: 64, alignItems: "center", justifyContent: "center" }}>
                {locked ? <Text style={{ fontSize: 28 }}>🔒</Text> : <Hero ps={42} ch={c} g={0} />}
              </View>
              <Text style={styles.cardName}>{c.name}</Text>
              <Text style={[styles.cardSub, sel && { color: accent }]}>{sel ? "✓ Seçili" : locked ? c.cost + " ★ gerek" : "Seç"}</Text>
            </Pressable>;
          })}
        </View>
      </View>
    </View>}

    <Text style={styles.footer}>Sol yarıya dokun: dünya sola döner • Sağ yarıya dokun: dünya sağa döner</Text>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#060d0b", overflow: "hidden" },
  blob: { position: "absolute", borderRadius: 400 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 10 },
  eyebrow: { fontSize: 9, letterSpacing: 3, fontWeight: "800" },
  title: { fontSize: 26, fontWeight: "900", letterSpacing: 2, color: "#f4ead5", marginTop: 2, textShadowColor: "rgba(255,255,255,.25)", textShadowRadius: 8, textShadowOffset: { width: 0, height: 0 } },
  iconBtn: { backgroundColor: "rgba(255,255,255,.07)", borderWidth: 1, borderColor: "rgba(255,255,255,.12)", paddingVertical: 8, paddingHorizontal: 11, borderRadius: 12 },
  restart: { paddingVertical: 9, paddingHorizontal: 13, borderRadius: 12, justifyContent: "center" },
  restartText: { color: "#0b1512", fontWeight: "900", fontSize: 12 },
  chips: { flexDirection: "row", gap: 6, paddingHorizontal: 16, marginTop: 12, flexWrap: "wrap" },
  chip: { minWidth: 38, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 10, backgroundColor: "rgba(255,255,255,.05)", borderWidth: 1, borderColor: "rgba(255,255,255,.12)", alignItems: "center" },
  chipLocked: { opacity: .45 },
  chipText: { color: "#d2d9cd", fontWeight: "800", fontSize: 12 },
  chipStars: { color: "#ffd86b", fontSize: 7, marginTop: -1 },
  statRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginTop: 12 },
  stat: { flex: 1, backgroundColor: "rgba(255,255,255,.05)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,.10)", padding: 9 },
  statLabel: { fontSize: 8, color: "#9fb0a6", fontWeight: "800", letterSpacing: 1 },
  statValue: { fontSize: 14, color: "#f6ecc8", fontWeight: "900", marginTop: 3 },
  statSub: { fontSize: 10, color: "#8fa093", fontWeight: "700" },
  boardFrame: { borderRadius: 16, borderWidth: 2, padding: 5, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,.45)", shadowOpacity: .85, shadowRadius: 18, shadowOffset: { width: 0, height: 0 }, elevation: 12 },
  goalOuter: { borderWidth: 2, borderColor: "#5dffb0", alignItems: "center", justifyContent: "center", shadowColor: "#5dffb0", shadowOpacity: 1, shadowRadius: 10 },
  player: { position: "absolute", backgroundColor: "#ffa733", borderWidth: 2, borderColor: "#ffd98a", shadowColor: "#ffa733", shadowOpacity: 1, shadowRadius: 10 },
  eyeWhite: { position: "absolute", backgroundColor: "#fff", overflow: "hidden" },
  zone: { flex: 1, alignItems: "center", justifyContent: "flex-end", paddingBottom: 8 },
  zoneHint: { color: "rgba(255,255,255,.10)", fontSize: 34, fontWeight: "900" },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(6,12,10,.72)", alignItems: "center", justifyContent: "center", padding: 22 },
  winOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(6,12,10,.80)", alignItems: "center", justifyContent: "center", padding: 22 },
  overlayTitle: { color: "#ffe9a8", fontSize: 22, fontWeight: "900", letterSpacing: 1.5, textAlign: "center" },
  overlayText: { color: "#d3d9ce", fontSize: 12, marginTop: 8, textAlign: "center", lineHeight: 18 },
  winEmoji: { fontSize: 38, marginBottom: 4 },
  stars: { color: "#ffd86b", fontSize: 30, marginTop: 6, letterSpacing: 4 },
  btn: { paddingVertical: 11, paddingHorizontal: 18, borderRadius: 12 },
  btnText: { color: "#0b1512", fontWeight: "900", fontSize: 13 },
  btnGhost: { borderWidth: 1.5, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
  btnGhostText: { fontWeight: "900", fontSize: 13 },
  pickerWrap: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(4,9,8,.86)", justifyContent: "center", padding: 16, zIndex: 50 },
  picker: { backgroundColor: "#0e1b17", borderRadius: 18, borderWidth: 1.5, borderColor: "rgba(255,255,255,.14)", padding: 16 },
  pickerTitle: { color: "#f6ecc8", fontSize: 20, fontWeight: "900", marginTop: 2 },
  pickerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 },
  card: { width: "30.5%", flexGrow: 1, backgroundColor: "rgba(255,255,255,.05)", borderRadius: 14, borderWidth: 1.5, borderColor: "rgba(255,255,255,.12)", padding: 8, alignItems: "center" },
  cardName: { color: "#f2e5c0", fontWeight: "900", fontSize: 12, marginTop: 2 },
  cardSub: { color: "#9fb0a6", fontSize: 10, fontWeight: "700", marginTop: 2 },
  footer: { textAlign: "center", fontSize: 10, color: "#718477", marginTop: 14, paddingHorizontal: 16, lineHeight: 15 }
});
