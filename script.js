// ⬇️ Supabase setup
const SUPABASE_URL = "https://ijxnlsywdbpzbrqiqubs.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqeG5sc3l3ZGJwemJycWlxdWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0NDc5MTAsImV4cCI6MjA2NjAyMzkxMH0.pu29rw0I6qML8HVqhBXPT4TWJA5_WmeTcfl7IToIA7I";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener("DOMContentLoaded", () => {
  let score = 0;
  let currentUser = {
    name: "Guest",
    house: "Hufflepuff",
    artifacts: [],
    spells: [],
    potions: [],
    quizCategory: "harry-potter",
    lastChallengeDate: "",
    currentChallenge: "",
    challengeCompleted: false
  };

  async function loadQuestion() {
    const category = currentUser.quizCategory || "harry-potter";
    try {
      const res = await fetch(
        `https://the-trivia-api.com/api/questions?limit=15&categories=${encodeURIComponent(category)}`
      );
      const questions = await res.json();
      if (!Array.isArray(questions) || questions.length < 15) throw new Error();
      startQuiz(questions);
    } catch {
      document.getElementById("feedback").textContent =
        "⚠️ Failed to load quiz. Please try again later.";
    }
  }

  function startQuiz(questions) {
    let index = 0;
    showQuestion(questions[index]);

    function showQuestion(q) {
      document.getElementById("question").textContent = q.question;
      const choices = [...q.incorrectAnswers];
      choices.splice(Math.floor(Math.random() * 4), 0, q.correctAnswer);
      const answers = document.getElementById("answers");
      answers.innerHTML = "";
      choices.forEach(c => {
        const btn = document.createElement("button");
        btn.textContent = c;
        btn.onclick = () => handleAnswer(q, c);
        answers.appendChild(btn);
      });
    }

    function handleAnswer(q, choice) {
      const fb = document.getElementById("feedback");
      if (choice === q.correctAnswer) {
        fb.textContent = "✅ Correct!";
        score += 10;
        document.getElementById("score").textContent = score;
        tryArtifact();
        tryUnlockSpell();
        checkChallengeProgress();
      } else {
        fb.textContent = "❌ Incorrect!";
        if (currentUser.potions.includes("Revive")) {
          fb.textContent += " ✨ Revive used!";
          currentUser.potions = currentUser.potions.filter(p => p !== "Revive");
        }
      }

      setTimeout(() => {
        fb.textContent = "";
        index++;
        if (index < questions.length) {
          showQuestion(questions[index]);
        } else {
          alert("🎉 Quiz complete!");
          submitScoreToSupabase();
        }
      }, 1000);
    }
  }

  async function submitScoreToSupabase() {
    const initials = currentUser.name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase();

    const { error } = await supabase.from("scores").insert([
      {
        initials,
        house: currentUser.house,
        score
      }
    ]);

    if (error) {
      console.error("Supabase insert error:", error.message);
    } else {
      fetchLeaderboardFromSupabase();
    }
  }

  async function fetchLeaderboardFromSupabase() {
    const { data, error } = await supabase
      .from("scores")
      .select("initials, house, score")
      .order("score", { ascending: false })
      .limit(5);

    const table = document.getElementById("vault-table");
    if (!table) return;
    table.innerHTML = "";

    if (error) {
      table.innerHTML = "<tr><td colspan='4'>Error loading leaderboard</td></tr>";
      return;
    }

    data.forEach((entry, i) => {
      const row = document.createElement("tr");
      row.innerHTML = `<td>${i + 1}</td><td>${entry.initials}</td><td>${entry.house}</td><td>${entry.score}</td>`;
      table.appendChild(row);
    });
  }

  function tryArtifact() {
    const all = ["Time Turner", "Invisibility Cloak", "Marauder’s Map"];
    const owned = currentUser.artifacts;
    const available = all.filter(a => !owned.includes(a));
    if (Math.random() > 0.75 && available.length) {
      const reward = available[Math.floor(Math.random() * available.length)];
      currentUser.artifacts.push(reward);
      document.getElementById("artifact-name").textContent = reward;
      document.getElementById("artifact-section").classList.remove("hidden");
      setTimeout(() => {
        document.getElementById("artifact-section").classList.add("hidden");
      }, 3000);
    }
  }

  function tryUnlockSpell() {
    const allSpells = [
      { name: "Lumos", effect: "Reveal hint" },
      { name: "Protego", effect: "Block wrong answer" },
      { name: "Accio", effect: "Auto-correct once" }
    ];
    const owned = currentUser.spells.map(s => s.name);
    const available = allSpells.filter(s => !owned.includes(s.name));
    if (Math.random() > 0.8 && available.length) {
      const newSpell = available[Math.floor(Math.random() * available.length)];
      currentUser.spells.push(newSpell);
      alert(`✨ New spell unlocked: ${newSpell.name}`);
    }
  }

  function showVault() {
    fetchLeaderboardFromSupabase();
    document.getElementById("vault").classList.remove("hidden");
  }

  function showPotions() {
    const grid = document.getElementById("potionGrid");
    grid.innerHTML = "";
    ["Moondew", "Mandrake Root", "Dragon Scale", "Phoenix Feather"].forEach(ing => {
      const el = document.createElement("div");
      el.textContent = ing;
      el.onclick = () => brew(ing);
      grid.appendChild(el);
    });
    document.getElementById("potionResult").textContent = "";
    document.getElementById("potionLab").classList.remove("hidden");
  }

  function brew(ingredient) {
    const effects = {
      "Moondew": "🧪 Calm Elixir (slows timer)",
      "Mandrake Root": "🌿 Memory Draft (replay a question)",
      "Dragon Scale": "🔥 Strength Elixir (+10 points)",
      "Phoenix Feather": "✨ Revive (undo one mistake)"
    };
    const effect = effects[ingredient];
    if (effect) {
      const potionName = effect.split(" ")[1];
      currentUser.potions.push(potionName);
      document.getElementById("potionResult").textContent = effect;
    }
  }

  function showSpells() {
    const list = document.getElementById("spellList");
    list.innerHTML = "";
    const spells = currentUser.spells || [];
    if (!spells.length) {
      list.innerHTML = "<li>No spells unlocked yet.</li>";
    } else {
      spells.forEach(sp => {
        const li = document.createElement("li");
        li.textContent = `${sp.name} — ${sp.effect}`;
        list.appendChild(li);
      });
    }
    document.getElementById("spellbook").classList.remove("hidden");
  }

  function checkChallengeProgress() {
    const challenge = currentUser.currentChallenge;
    if (!challenge || currentUser.challengeCompleted) return;

    if (
      (challenge.includes("30") && score >= 30) ||
      (challenge.includes("Magic") && currentUser.quizCategory === "magic_and_spells") ||
      (challenge.includes("artifact") && currentUser.artifacts.length > 0)
    ) {
      currentUser.challengeCompleted = true;
      alert("🌟 Daily challenge completed!");
    }
  }

  loadQuestion();
});
