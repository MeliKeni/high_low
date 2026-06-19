import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { QRCodeSVG } from "qrcode.react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { countries } from "./populationData";
import "./styles.css";

const ROOM_ID = "ltd";
const LOCAL_NETWORK_HOST = "10.4.52.206";
const EVENT_BACKGROUND = "/assets/ltd-background.jpg";
const EVENT_FLYER = "/assets/ltd-flyer.png";

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function useViewportWidth() {
  const [width, setWidth] = useState(() => (typeof window === "undefined" ? 1024 : window.innerWidth));

  useEffect(() => {
    function handleResize() {
      setWidth(window.innerWidth);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return width;
}

function getSavedQrHost() {
  if (typeof window === "undefined") return "";
  const savedHost = localStorage.getItem("ltdQrHost");
  const currentHost = window.location.hostname;
  const localHosts = ["localhost", "127.0.0.1", "::1"];

  if (savedHost && !localHosts.includes(savedHost)) return savedHost;
  if (!localHosts.includes(currentHost)) return currentHost;
  return LOCAL_NETWORK_HOST;
}

function useLeaderboard(room = ROOM_ID) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadScores() {
      try {
        const response = await fetch(`/api/scores?room=${room}`);
        const payload = await response.json();
        if (active) setScores(payload.scores ?? []);
      } catch {
        if (active) setScores([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadScores();
    const timer = setInterval(loadScores, 2500);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [room]);

  return { scores, loading };
}

function HostScreen() {
  const { scores, loading } = useLeaderboard();
  const [qrHost, setQrHost] = useState(getSavedQrHost);
  const port = window.location.port ? `:${window.location.port}` : "";
  const qrTarget = qrHost.trim() || window.location.hostname;
  const baseUrl = qrTarget.startsWith("http") ? qrTarget.replace(/\/$/, "") : `${window.location.protocol}//${qrTarget}${port}`;
  const playUrl = `${baseUrl}/play?room=${ROOM_ID}`;

  function updateQrHost(value) {
    setQrHost(value);
    localStorage.setItem("ltdQrHost", value);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.hostShell}>
        <View style={styles.topNav}>
          <Text style={styles.brandMark}>BBYO Argentina</Text>
          <View style={styles.navLinks}>
            <Text style={styles.navLink}>Chapters</Text>
            <Text style={styles.navLink}>Regional</Text>
            <Text style={styles.navLink}>Gallery</Text>
          </View>
        </View>

        <View style={[styles.hostHero, { backgroundImage: `linear-gradient(90deg, rgba(83, 181, 224, 0.95), rgba(83, 181, 224, 0.76)), url(${EVENT_BACKGROUND})` }]}>
          <View style={styles.heroContent}>
            <Text style={styles.kicker}>Leadership Training Day</Text>
            <Text style={styles.hostTitle}>Higher or Lower</Text>
            <Text style={styles.hostCopy}>Una experiencia regional para jugar, liderar y descubrir comunidades judias alrededor del mundo.</Text>
            <Pressable style={styles.linkButton} onPress={() => window.open(playUrl, "_blank")}>
              <Text style={styles.linkButtonText}>Abrir juego</Text>
            </Pressable>
          </View>
          <View style={[styles.flyerPreview, { backgroundImage: `url(${EVENT_FLYER})` }]}>
            <Text style={styles.flyerFallback}>LTD 4th edition</Text>
          </View>
        </View>

        <View style={styles.opportunityStrip}>
          <Text style={styles.opportunityLabel}>BBYO ARGENTINA</Text>
          <Text style={styles.opportunityTitle}>More jewish teens, more meaningful experiences</Text>
          <Text style={styles.opportunityMeta}>Sin limite de rondas</Text>
        </View>

        <View style={styles.hostGrid}>
          <View style={styles.qrPanel}>
            <Text style={[styles.panelTitle, styles.qrPanelTitle]}>Escanea para jugar</Text>
            <View style={styles.qrBox}>
              <QRCodeSVG value={playUrl} size={280} level="H" bgColor="#fffaf0" fgColor="#101820" />
            </View>
            <TextInput
              style={styles.networkInput}
              value={qrHost}
              onChangeText={updateQrHost}
              placeholder="IP o URL para el QR"
              placeholderTextColor="#7b8390"
            />
            <Text style={styles.urlText}>{playUrl}</Text>
            <Text style={styles.helperText}>Si el celular no abre, proba escribir esta URL manualmente. Tiene que estar en el mismo Wi-Fi que esta compu.</Text>
          </View>

          <View style={styles.boardPanel}>
            <View style={styles.boardHeader}>
              <Text style={styles.panelTitle}>Ranking en vivo</Text>
              {loading ? <ActivityIndicator color="#f2c94c" /> : <Text style={styles.countText}>{scores.length} jugadores</Text>}
            </View>
            {scores.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Todavia no hay puntajes</Text>
                <Text style={styles.emptyCopy}>Cuando alguien termine una partida, aparece aca automaticamente.</Text>
              </View>
            ) : (
              scores.map((entry, index) => <ScoreRow key={`${entry.id}-${index}`} entry={entry} rank={index + 1} />)
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ScoreRow({ entry, rank }) {
  return (
    <View style={[styles.scoreRow, rank <= 3 && styles.topScoreRow]}>
      <View style={styles.rankBadge}>
        <Text style={styles.rankText}>{rank}</Text>
      </View>
      <View style={styles.scoreNameBlock}>
        <Text style={styles.scoreName}>{entry.name}</Text>
        <Text style={styles.scoreMeta}>{entry.rounds ?? entry.score} rondas jugadas</Text>
      </View>
      <Text style={styles.scoreValue}>{entry.score}</Text>
    </View>
  );
}

function PlayerScreen() {
  const params = new URLSearchParams(window.location.search);
  const room = params.get("room") || ROOM_ID;
  const width = useViewportWidth();
  const isCompactGame = width < 760;
  const [name, setName] = useState("");
  const [started, setStarted] = useState(false);
  const [deck, setDeck] = useState(() => shuffle(countries));
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestScore, setBestScore] = useState(() => Number(localStorage.getItem("ltdBestScore") || 0));
  const [feedback, setFeedback] = useState(null);
  const [finished, setFinished] = useState(false);
  const [lossReason, setLossReason] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const currentPair = useMemo(() => {
    const index = (round - 1) % deck.length;
    return [deck[index], deck[(index + 1) % deck.length]];
  }, [deck, round]);

  useEffect(() => {
    if (!started || finished || feedback) return undefined;

    function handleKeyDown(event) {
      const key = event.key.toLowerCase();
      if (key === "arrowup" || key === "h") {
        answer("higher");
      }
      if (key === "arrowdown" || key === "l") {
        answer("lower");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [started, finished, feedback, currentPair, score, streak]);

  async function submitScore(finalScore, roundsPlayed) {
    if (submitted) return;
    setSubmitted(true);
    try {
      await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room,
          name: name.trim() || "Jugador LTD",
          score: finalScore,
          rounds: roundsPlayed
        })
      });
    } catch {
      setSubmitted(false);
    }
  }

  function answer(choice) {
    if (feedback || finished) return;
    const [left, right] = currentPair;
    const isHigher = right.population >= left.population;
    const correct = choice === (isHigher ? "higher" : "lower");
    const nextScore = correct ? score + 1 : score;
    const nextStreak = correct ? streak + 1 : 0;

    setScore(nextScore);
    setStreak(nextStreak);
    if (nextScore > bestScore) {
      setBestScore(nextScore);
      localStorage.setItem("ltdBestScore", String(nextScore));
    }
    setFeedback({
      correct,
      text: correct ? "Correcto" : "Casi",
      detail: `${right.country}: ${formatNumber(right.population)} personas`,
      choice
    });

    setTimeout(() => {
      if (!correct) {
        setLossReason(`${right.country}: ${formatNumber(right.population)} personas`);
        setFinished(true);
        submitScore(nextScore, round);
      } else {
        if (round % deck.length === 0) {
          setDeck(shuffle(countries));
        }
        setRound((value) => value + 1);
        setFeedback(null);
      }
    }, correct ? 900 : 1500);
  }

  function restart() {
    setDeck(shuffle(countries));
    setRound(1);
    setScore(0);
    setStreak(0);
    setFeedback(null);
    setFinished(false);
    setLossReason("");
    setSubmitted(false);
  }

  if (!started) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.playerShell, styles.playerIntroShell, { backgroundImage: `linear-gradient(180deg, rgba(83, 181, 224, 0.9), rgba(9, 50, 74, 0.94)), url(${EVENT_BACKGROUND})` }]}>
          <Text style={styles.kicker}>Leadership Training Day</Text>
          <Text style={styles.gameTitle}>Higher or Lower</Text>
          <Text style={styles.gameCopy}>Adivina que pais tiene una comunidad judia mas grande. Seguis jugando hasta que te equivoques.</Text>
          <View style={styles.previewDuel}>
            <Text style={styles.previewCountry}>Israel</Text>
            <Text style={styles.previewVs}>VS</Text>
            <Text style={styles.previewCountry}>Argentina</Text>
          </View>
          <View style={styles.startBadges}>
            <Text style={styles.startBadge}>OPEN</Text>
            <Text style={styles.startBadge}>NO ROUND CAP</Text>
            <Text style={styles.startBadge}>LIVE RANKING</Text>
          </View>
          <TextInput
            style={styles.nameInput}
            value={name}
            onChangeText={setName}
            maxLength={24}
            placeholder="Tu nombre"
            placeholderTextColor="#7b8390"
          />
          <Pressable style={styles.primaryButton} onPress={() => setStarted(true)}>
            <Text style={styles.primaryButtonText}>Jugar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (finished) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.playerShell, styles.playerIntroShell, { backgroundImage: `linear-gradient(180deg, rgba(83, 181, 224, 0.88), rgba(9, 50, 74, 0.95)), url(${EVENT_BACKGROUND})` }]}>
          <Text style={styles.kicker}>{lossReason ? "Perdiste" : "Puntaje final"}</Text>
          <Text style={styles.finalScore}>{score}</Text>
          <Text style={styles.gameCopy}>Mejor puntaje en este celular: {bestScore}</Text>
          {lossReason ? <Text style={styles.gameCopy}>Respuesta correcta: {lossReason}</Text> : null}
          <Text style={styles.gameCopy}>{submitted ? "Tu resultado ya esta en el ranking." : "Subiendo puntaje..."}</Text>
          <Pressable style={styles.primaryButton} onPress={restart}>
            <Text style={styles.primaryButtonText}>Jugar otra vez</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const [left, right] = currentPair;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.gameShell, { backgroundImage: `linear-gradient(180deg, rgba(236, 249, 255, 0.96), rgba(255, 255, 255, 0.94)), url(${EVENT_BACKGROUND})` }]}>
        <View style={styles.gameTopbar}>
          <Text style={styles.statText}>Ronda {round}</Text>
          <Text style={styles.scoreTicker}>Score {score}</Text>
          <Text style={styles.statText}>Best {bestScore}</Text>
        </View>

        <View style={[styles.duelStage, isCompactGame && styles.duelStageCompact]}>
          <DuelCard country={left} known side="left" />
          <View style={[styles.centerBadge, isCompactGame && styles.centerBadgeCompact]}>
            <Text style={styles.centerScore}>{score}</Text>
            <Text style={styles.centerLabel}>VS</Text>
          </View>
          <DuelCard country={right} feedback={feedback} onAnswer={answer} side="right" />
        </View>

        <View style={styles.roundFooter}>
          {feedback ? (
            <View style={[styles.feedbackBox, feedback.correct ? styles.feedbackGood : styles.feedbackBad]}>
              <Text style={styles.feedbackTitle}>{feedback.text}</Text>
              <Text style={styles.feedbackCopy}>{feedback.detail}</Text>
            </View>
          ) : (
            <Text style={styles.questionText}>Tiene una comunidad judia mas grande o mas chica?</Text>
          )}
          <Text style={styles.streakText}>Racha actual: {streak}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function DuelCard({ country, known = false, feedback = null, onAnswer, side }) {
  const revealed = known || Boolean(feedback);

  return (
    <View style={[styles.duelCard, side === "right" && styles.duelCardRight]}>
      <View style={styles.countryStamp}>
        <Text style={styles.flag}>{getInitials(country.country)}</Text>
      </View>
      <View style={styles.duelTextBlock}>
        <Text style={[styles.cardPrompt, side === "right" && styles.cardPromptRight]}>{known ? "tiene" : "tiene..."}</Text>
        <Text style={[styles.countryName, side === "right" && styles.countryNameRight]}>{country.country}</Text>
        <Text style={[styles.countryRegion, side === "right" && styles.countryRegionRight]}>{country.region}</Text>
      </View>
      {revealed ? (
        <View style={styles.populationBlock}>
          <Text style={[styles.populationValue, side === "right" && styles.populationValueRight]}>{formatNumber(country.population)}</Text>
          <Text style={[styles.populationLabel, side === "right" && styles.populationLabelRight]}>personas estimadas</Text>
        </View>
      ) : (
        <View style={styles.actionStack}>
          <Pressable style={styles.choiceButton} onPress={() => onAnswer("higher")}>
            <Text style={styles.choiceButtonText}>Higher</Text>
            <Text style={styles.choiceButtonSubtext}>mas grande</Text>
          </Pressable>
          <Pressable style={styles.choiceButtonDark} onPress={() => onAnswer("lower")}>
            <Text style={styles.choiceButtonDarkText}>Lower</Text>
            <Text style={styles.choiceButtonDarkSubtext}>mas chica</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function App() {
  const path = window.location.pathname;
  return path.startsWith("/play") ? <PlayerScreen /> : <HostScreen />;
}

const styles = StyleSheet.create({
  safeArea: {
    minHeight: "100vh",
    backgroundColor: "#eaf8ff"
  },
  hostShell: {
    minHeight: "100vh",
    backgroundColor: "#eaf8ff",
    padding: 24,
    gap: 22
  },
  topNav: {
    width: "100%",
    maxWidth: 1180,
    marginHorizontal: "auto",
    minHeight: 64,
    borderBottomWidth: 1,
    borderBottomColor: "#b9e6f7",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  brandMark: {
    color: "#1597d3",
    fontSize: 30,
    fontWeight: "900"
  },
  navLinks: {
    flexDirection: "row",
    gap: 18
  },
  navLink: {
    color: "#0f5c83",
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  hostHero: {
    width: "100%",
    maxWidth: 1180,
    marginHorizontal: "auto",
    minHeight: 430,
    borderRadius: 8,
    padding: 30,
    backgroundColor: "#53b5e0",
    backgroundSize: "cover",
    backgroundPosition: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 24,
    overflow: "hidden"
  },
  heroContent: {
    flex: 1,
    maxWidth: 680,
    gap: 12
  },
  kicker: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  hostTitle: {
    color: "#ffffff",
    fontSize: 72,
    lineHeight: 76,
    fontWeight: "900",
    letterSpacing: 0
  },
  hostCopy: {
    color: "#ffffff",
    maxWidth: 680,
    fontSize: 20,
    lineHeight: 29,
    fontWeight: "700"
  },
  linkButton: {
    alignSelf: "flex-start",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20
  },
  linkButtonText: {
    color: "#1597d3",
    fontSize: 16,
    fontWeight: "800"
  },
  flyerPreview: {
    width: 230,
    aspectRatio: 0.78,
    borderRadius: 8,
    backgroundColor: "#b9e6f7",
    backgroundSize: "cover",
    backgroundPosition: "center",
    borderColor: "rgba(255,255,255,0.85)",
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center"
  },
  flyerFallback: {
    color: "#ffffff",
    fontSize: 26,
    lineHeight: 30,
    fontWeight: "900",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.28)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6
  },
  opportunityStrip: {
    width: "100%",
    maxWidth: 1180,
    marginHorizontal: "auto",
    backgroundColor: "#fffaf0",
    borderColor: "#b9e6f7",
    borderWidth: 1,
    borderRadius: 8,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16
  },
  opportunityLabel: {
    color: "#1597d3",
    fontSize: 13,
    fontWeight: "900"
  },
  opportunityTitle: {
    color: "#09324a",
    flex: 1,
    fontSize: 22,
    fontWeight: "900"
  },
  opportunityMeta: {
    color: "#0f5c83",
    fontSize: 14,
    fontWeight: "800"
  },
  hostGrid: {
    width: "100%",
    maxWidth: 1180,
    marginHorizontal: "auto",
    display: "grid",
    gridTemplateColumns: "minmax(320px, 420px) minmax(360px, 1fr)",
    gap: 24
  },
  qrPanel: {
    backgroundColor: "#1597d3",
    borderColor: "#b9e6f7",
    borderWidth: 1,
    borderRadius: 8,
    padding: 24,
    gap: 18,
    alignItems: "center"
  },
  boardPanel: {
    backgroundColor: "#ffffff",
    borderColor: "#b9e6f7",
    borderWidth: 1,
    borderRadius: 8,
    padding: 20,
    gap: 12,
    minHeight: 460
  },
  panelTitle: {
    color: "#09324a",
    fontSize: 24,
    fontWeight: "900"
  },
  qrPanelTitle: {
    color: "#fffaf0"
  },
  qrBox: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 18
  },
  networkInput: {
    width: "100%",
    height: 48,
    borderWidth: 1,
    borderColor: "#b9e6f7",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    color: "#09324a",
    paddingHorizontal: 14,
    fontSize: 16,
    textAlign: "center",
    outlineStyle: "none"
  },
  urlText: {
    color: "#ffffff",
    fontSize: 14,
    textAlign: "center"
  },
  helperText: {
    color: "#eaf8ff",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center"
  },
  boardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 6
  },
  countText: {
    color: "#101010",
    fontWeight: "700"
  },
  emptyState: {
    flex: 1,
    minHeight: 300,
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  emptyTitle: {
    color: "#101010",
    fontSize: 22,
    fontWeight: "900"
  },
  emptyCopy: {
    color: "#424242",
    fontSize: 15,
    textAlign: "center"
  },
  scoreRow: {
    minHeight: 68,
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#eaf8ff",
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  topScoreRow: {
    backgroundColor: "#d2f0fb"
  },
  rankBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#ffd447",
    alignItems: "center",
    justifyContent: "center"
  },
  rankText: {
    color: "#09324a",
    fontSize: 18,
    fontWeight: "900"
  },
  scoreNameBlock: {
    flex: 1,
    minWidth: 0
  },
  scoreName: {
    color: "#09324a",
    fontSize: 19,
    fontWeight: "900"
  },
  scoreMeta: {
    color: "#0f5c83",
    fontSize: 13,
    fontWeight: "700"
  },
  scoreValue: {
    color: "#1597d3",
    fontSize: 32,
    fontWeight: "900"
  },
  playerShell: {
    minHeight: "100vh",
    width: "100%",
    maxWidth: 560,
    marginHorizontal: "auto",
    padding: 24,
    justifyContent: "center",
    gap: 18
  },
  playerIntroShell: {
    maxWidth: "100%",
    paddingHorizontal: "calc((100vw - 560px) / 2 + 24px)",
    backgroundColor: "#53b5e0",
    backgroundSize: "cover",
    backgroundPosition: "center"
  },
  gameTitle: {
    color: "#ffffff",
    fontSize: 48,
    lineHeight: 52,
    fontWeight: "900"
  },
  gameCopy: {
    color: "#ffffff",
    fontSize: 18,
    lineHeight: 26
  },
  startBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  startBadge: {
    color: "#09324a",
    backgroundColor: "#ffd447",
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    fontSize: 12,
    fontWeight: "900"
  },
  previewDuel: {
    minHeight: 82,
    borderColor: "#ffffff",
    borderWidth: 2,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.16)"
  },
  previewCountry: {
    color: "#ffffff",
    flex: 1,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center"
  },
  previewVs: {
    color: "#09324a",
    backgroundColor: "#ffd447",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 14,
    fontWeight: "900"
  },
  nameInput: {
    height: 56,
    borderWidth: 1,
    borderColor: "#ffffff",
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.92)",
    color: "#09324a",
    paddingHorizontal: 16,
    fontSize: 18,
    outlineStyle: "none"
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: 8,
    backgroundColor: "#ffd447",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18
  },
  primaryButtonText: {
    color: "#09324a",
    fontSize: 18,
    fontWeight: "900"
  },
  finalScore: {
    color: "#ffffff",
    fontSize: 88,
    lineHeight: 94,
    fontWeight: "900"
  },
  gameShell: {
    minHeight: "100vh",
    width: "100%",
    maxWidth: 1180,
    marginHorizontal: "auto",
    padding: 18,
    gap: 14,
    justifyContent: "center",
    backgroundColor: "#eaf8ff",
    backgroundSize: "cover",
    backgroundPosition: "center"
  },
  gameTopbar: {
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderColor: "#b9e6f7",
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  statText: {
    color: "#0f5c83",
    fontSize: 14,
    fontWeight: "800"
  },
  scoreTicker: {
    color: "#1597d3",
    fontSize: 22,
    fontWeight: "900"
  },
  duelStage: {
    minHeight: 530,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    position: "relative"
  },
  duelStageCompact: {
    minHeight: 0,
    display: "flex",
    flexDirection: "column"
  },
  duelCard: {
    minHeight: 530,
    backgroundColor: "#ffffff",
    borderColor: "#b9e6f7",
    borderWidth: 1,
    borderRadius: 8,
    padding: 22,
    gap: 22,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  duelCardRight: {
    backgroundColor: "#1597d3"
  },
  countryStamp: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#ffd447",
    alignItems: "center",
    justifyContent: "center"
  },
  flag: {
    color: "#09324a",
    fontSize: 28,
    fontWeight: "900"
  },
  duelTextBlock: {
    gap: 6,
    alignItems: "center"
  },
  cardPrompt: {
    color: "#0f5c83",
    fontSize: 17,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  cardPromptRight: {
    color: "#dff5ff"
  },
  countryName: {
    color: "#09324a",
    fontSize: 42,
    lineHeight: 48,
    fontWeight: "900",
    textAlign: "center"
  },
  countryNameRight: {
    color: "#fffaf0"
  },
  countryRegion: {
    color: "#0f5c83",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center"
  },
  countryRegionRight: {
    color: "#dff5ff"
  },
  populationBlock: {
    minHeight: 98,
    alignItems: "center",
    justifyContent: "center"
  },
  populationLabel: {
    color: "#0f5c83",
    fontSize: 14,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  populationLabelRight: {
    color: "#dff5ff"
  },
  populationValue: {
    color: "#09324a",
    fontSize: 44,
    lineHeight: 50,
    fontWeight: "900"
  },
  populationValueRight: {
    color: "#fffaf0"
  },
  actionStack: {
    width: "100%",
    maxWidth: 260,
    gap: 12
  },
  centerBadge: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: "#ffd447",
    borderColor: "#ffffff",
    borderWidth: 5,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    left: "50%",
    top: "50%",
    marginLeft: -52,
    marginTop: -52,
    zIndex: 3
  },
  centerBadgeCompact: {
    top: "50%",
    width: 72,
    height: 72,
    borderRadius: 36,
    marginLeft: -36,
    marginTop: -36
  },
  centerScore: {
    color: "#09324a",
    fontSize: 34,
    lineHeight: 36,
    fontWeight: "900"
  },
  centerLabel: {
    color: "#09324a",
    fontSize: 12,
    fontWeight: "900"
  },
  roundFooter: {
    minHeight: 118,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderColor: "#b9e6f7",
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  questionText: {
    color: "#09324a",
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900",
    textAlign: "center"
  },
  answerButtons: {
    flexDirection: "row",
    gap: 12
  },
  choiceButton: {
    width: "100%",
    minHeight: 70,
    borderRadius: 8,
    backgroundColor: "#ffd447",
    alignItems: "center",
    justifyContent: "center",
    borderColor: "#ffffff",
    borderWidth: 2
  },
  choiceButtonText: {
    color: "#09324a",
    fontSize: 22,
    fontWeight: "900"
  },
  choiceButtonSubtext: {
    color: "#09324a",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  choiceButtonDark: {
    width: "100%",
    minHeight: 70,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    borderColor: "#dff5ff",
    borderWidth: 2
  },
  choiceButtonDarkText: {
    color: "#1597d3",
    fontSize: 22,
    fontWeight: "900"
  },
  choiceButtonDarkSubtext: {
    color: "#0f5c83",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  streakText: {
    color: "#1597d3",
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  feedbackBox: {
    borderRadius: 8,
    padding: 18,
    alignItems: "center",
    gap: 6
  },
  feedbackGood: {
    backgroundColor: "#1597d3"
  },
  feedbackBad: {
    backgroundColor: "#d64f6f"
  },
  feedbackTitle: {
    color: "#fffaf0",
    fontSize: 26,
    fontWeight: "900"
  },
  feedbackCopy: {
    color: "#fffaf0",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center"
  }
});

createRoot(document.getElementById("root")).render(<App />);
