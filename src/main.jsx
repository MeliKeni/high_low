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
const TOTAL_ROUNDS = 12;
const LOCAL_NETWORK_HOST = "10.4.52.206";

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
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
        <View style={styles.hostHeader}>
          <View>
            <Text style={styles.kicker}>BBYO Regional LTD</Text>
            <Text style={styles.hostTitle}>Higher or Lower</Text>
          </View>
          <Pressable style={styles.linkButton} onPress={() => window.open(playUrl, "_blank")}>
            <Text style={styles.linkButtonText}>Abrir juego</Text>
          </Pressable>
        </View>

        <View style={styles.hostGrid}>
          <View style={styles.qrPanel}>
            <Text style={styles.panelTitle}>Escaneá para jugar</Text>
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
            <Text style={styles.helperText}>Si el celular no abre, probá escribir esta URL manualmente. Tiene que estar en el mismo Wi-Fi que esta compu.</Text>
          </View>

          <View style={styles.boardPanel}>
            <View style={styles.boardHeader}>
              <Text style={styles.panelTitle}>Ranking en vivo</Text>
              {loading ? <ActivityIndicator color="#f2c94c" /> : <Text style={styles.countText}>{scores.length} jugadores</Text>}
            </View>
            {scores.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Todavía no hay puntajes</Text>
                <Text style={styles.emptyCopy}>Cuando alguien termine una partida, aparece acá automáticamente.</Text>
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
        <Text style={styles.scoreMeta}>{entry.rounds ?? TOTAL_ROUNDS} rondas</Text>
      </View>
      <Text style={styles.scoreValue}>{entry.score}</Text>
    </View>
  );
}

function PlayerScreen() {
  const params = new URLSearchParams(window.location.search);
  const room = params.get("room") || ROOM_ID;
  const [name, setName] = useState("");
  const [started, setStarted] = useState(false);
  const [deck, setDeck] = useState(() => shuffle(countries));
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [finished, setFinished] = useState(false);
  const [lossReason, setLossReason] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const currentPair = useMemo(() => {
    const index = (round - 1) * 2;
    if (index + 1 >= deck.length) {
      setDeck(shuffle(countries));
      return [countries[0], countries[1]];
    }
    return [deck[index], deck[index + 1]];
  }, [deck, round]);

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
    setFeedback({
      correct,
      text: correct ? "Correcto" : "Casi",
      detail: `${right.country}: ${formatNumber(right.population)} personas`
    });

    setTimeout(() => {
      if (!correct) {
        setLossReason(`${right.country}: ${formatNumber(right.population)} personas`);
        setFinished(true);
        submitScore(nextScore, round);
      } else if (round >= TOTAL_ROUNDS) {
        setFinished(true);
        submitScore(nextScore, TOTAL_ROUNDS);
      } else {
        setRound((value) => value + 1);
        setFeedback(null);
      }
    }, 1050);
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
        <View style={styles.playerShell}>
          <Text style={styles.kicker}>Leadership Training Day</Text>
          <Text style={styles.gameTitle}>Higher or Lower</Text>
          <Text style={styles.gameCopy}>Adiviná qué país tiene una comunidad judía más grande.</Text>
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
        <View style={styles.playerShell}>
          <Text style={styles.kicker}>{lossReason ? "Perdiste" : "Puntaje final"}</Text>
          <Text style={styles.finalScore}>{score}/{TOTAL_ROUNDS}</Text>
          {lossReason ? <Text style={styles.gameCopy}>Respuesta correcta: {lossReason}</Text> : null}
          <Text style={styles.gameCopy}>{submitted ? "Tu resultado ya está en el ranking." : "Subiendo puntaje..."}</Text>
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
      <View style={styles.gameShell}>
        <View style={styles.statsRow}>
          <Text style={styles.statText}>Ronda {round}/{TOTAL_ROUNDS}</Text>
          <Text style={styles.statText}>Puntos {score}</Text>
          <Text style={styles.statText}>Racha {streak}</Text>
        </View>

        <CountryPanel country={left} known />

        <View style={styles.versus}>
          <Text style={styles.versusText}>VS</Text>
        </View>

        <CountryPanel country={right} />

        <View style={styles.answerPanel}>
          {feedback ? (
            <View style={[styles.feedbackBox, feedback.correct ? styles.feedbackGood : styles.feedbackBad]}>
              <Text style={styles.feedbackTitle}>{feedback.text}</Text>
              <Text style={styles.feedbackCopy}>{feedback.detail}</Text>
            </View>
          ) : (
            <>
              <Text style={styles.questionText}>¿{right.country} tiene más o menos?</Text>
              <View style={styles.answerButtons}>
                <Pressable style={styles.choiceButton} onPress={() => answer("higher")}>
                  <Text style={styles.choiceButtonText}>Más</Text>
                </Pressable>
                <Pressable style={styles.choiceButton} onPress={() => answer("lower")}>
                  <Text style={styles.choiceButtonText}>Menos</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

function CountryPanel({ country, known = false }) {
  return (
    <View style={styles.countryPanel}>
      <Text style={styles.flag}>{country.flag}</Text>
      <View style={styles.countryTextBlock}>
        <Text style={styles.countryName}>{country.country}</Text>
        <Text style={styles.countryRegion}>{country.region}</Text>
      </View>
      <View style={styles.populationPill}>
        <Text style={styles.populationLabel}>{known ? "Comunidad estimada" : "¿Mayor o menor?"}</Text>
        <Text style={styles.populationValue}>{known ? formatNumber(country.population) : "?"}</Text>
      </View>
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
    backgroundColor: "#101820"
  },
  hostShell: {
    minHeight: "100vh",
    padding: 32,
    gap: 28
  },
  hostHeader: {
    width: "100%",
    maxWidth: 1180,
    marginHorizontal: "auto",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16
  },
  kicker: {
    color: "#f2c94c",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  hostTitle: {
    color: "#fffaf0",
    fontSize: 54,
    lineHeight: 60,
    fontWeight: "900",
    letterSpacing: 0
  },
  linkButton: {
    backgroundColor: "#fffaf0",
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20
  },
  linkButtonText: {
    color: "#101820",
    fontSize: 16,
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
    backgroundColor: "#19313b",
    borderColor: "#2a4a55",
    borderWidth: 1,
    borderRadius: 8,
    padding: 24,
    gap: 18,
    alignItems: "center"
  },
  boardPanel: {
    backgroundColor: "#16262d",
    borderColor: "#2a4a55",
    borderWidth: 1,
    borderRadius: 8,
    padding: 20,
    gap: 12,
    minHeight: 460
  },
  panelTitle: {
    color: "#fffaf0",
    fontSize: 24,
    fontWeight: "900"
  },
  qrBox: {
    backgroundColor: "#fffaf0",
    borderRadius: 8,
    padding: 18
  },
  networkInput: {
    width: "100%",
    height: 48,
    borderWidth: 1,
    borderColor: "#2a4a55",
    borderRadius: 8,
    backgroundColor: "#101820",
    color: "#fffaf0",
    paddingHorizontal: 14,
    fontSize: 16,
    textAlign: "center",
    outlineStyle: "none"
  },
  urlText: {
    color: "#c8d6da",
    fontSize: 14,
    textAlign: "center"
  },
  helperText: {
    color: "#9fb4ba",
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
    color: "#9fb4ba",
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
    color: "#fffaf0",
    fontSize: 22,
    fontWeight: "900"
  },
  emptyCopy: {
    color: "#9fb4ba",
    fontSize: 15,
    textAlign: "center"
  },
  scoreRow: {
    minHeight: 68,
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#203942",
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  topScoreRow: {
    backgroundColor: "#2f473f"
  },
  rankBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#f2c94c",
    alignItems: "center",
    justifyContent: "center"
  },
  rankText: {
    color: "#101820",
    fontSize: 18,
    fontWeight: "900"
  },
  scoreNameBlock: {
    flex: 1,
    minWidth: 0
  },
  scoreName: {
    color: "#fffaf0",
    fontSize: 19,
    fontWeight: "900"
  },
  scoreMeta: {
    color: "#9fb4ba",
    fontSize: 13,
    fontWeight: "700"
  },
  scoreValue: {
    color: "#fffaf0",
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
  gameTitle: {
    color: "#fffaf0",
    fontSize: 48,
    lineHeight: 52,
    fontWeight: "900"
  },
  gameCopy: {
    color: "#c8d6da",
    fontSize: 18,
    lineHeight: 26
  },
  nameInput: {
    height: 56,
    borderWidth: 1,
    borderColor: "#2a4a55",
    borderRadius: 8,
    backgroundColor: "#16262d",
    color: "#fffaf0",
    paddingHorizontal: 16,
    fontSize: 18,
    outlineStyle: "none"
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: 8,
    backgroundColor: "#f2c94c",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18
  },
  primaryButtonText: {
    color: "#101820",
    fontSize: 18,
    fontWeight: "900"
  },
  finalScore: {
    color: "#fffaf0",
    fontSize: 88,
    lineHeight: 94,
    fontWeight: "900"
  },
  gameShell: {
    minHeight: "100vh",
    width: "100%",
    maxWidth: 640,
    marginHorizontal: "auto",
    padding: 16,
    gap: 12,
    justifyContent: "center"
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8
  },
  statText: {
    color: "#c8d6da",
    fontSize: 14,
    fontWeight: "800"
  },
  countryPanel: {
    minHeight: 170,
    backgroundColor: "#16262d",
    borderColor: "#2a4a55",
    borderWidth: 1,
    borderRadius: 8,
    padding: 18,
    gap: 14,
    justifyContent: "space-between"
  },
  flag: {
    color: "#f2c94c",
    fontSize: 36,
    fontWeight: "900"
  },
  countryTextBlock: {
    gap: 4
  },
  countryName: {
    color: "#fffaf0",
    fontSize: 31,
    lineHeight: 36,
    fontWeight: "900"
  },
  countryRegion: {
    color: "#9fb4ba",
    fontSize: 15,
    fontWeight: "700"
  },
  populationPill: {
    alignSelf: "flex-start",
    borderRadius: 8,
    backgroundColor: "#203942",
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 2
  },
  populationLabel: {
    color: "#9fb4ba",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  populationValue: {
    color: "#fffaf0",
    fontSize: 23,
    fontWeight: "900"
  },
  versus: {
    height: 44,
    alignItems: "center",
    justifyContent: "center"
  },
  versusText: {
    color: "#f2c94c",
    fontSize: 18,
    fontWeight: "900"
  },
  answerPanel: {
    minHeight: 136,
    justifyContent: "center",
    gap: 14
  },
  questionText: {
    color: "#fffaf0",
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
    flex: 1,
    minHeight: 58,
    borderRadius: 8,
    backgroundColor: "#f2c94c",
    alignItems: "center",
    justifyContent: "center"
  },
  choiceButtonText: {
    color: "#101820",
    fontSize: 20,
    fontWeight: "900"
  },
  feedbackBox: {
    borderRadius: 8,
    padding: 18,
    alignItems: "center",
    gap: 6
  },
  feedbackGood: {
    backgroundColor: "#1f5d4a"
  },
  feedbackBad: {
    backgroundColor: "#6b2e37"
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
