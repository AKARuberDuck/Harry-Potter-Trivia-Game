document.addEventListener("DOMContentLoaded", () => {
  let currentUser = null;
  let previousQuestion = null;
  let score = 0;

  const forbiddenNames = [
    "harry potter", "hermione granger", "ron weasley",
    "albus dumbledore", "severus snape", "draco malfoy",
    "voldemort", "minerva mcgonagall"
  ];

  const quizData = {
    general: [],
    magic: [],
    creatures: [],
    mythology: [
      { q: "Who is the king of the Greek gods?", answers: ["Zeus", "Hades", "Poseidon", "Hermes"], correct: "Zeus" },
      { q: "What is Thor's hammer called?", answers: ["Mjölnir", "Gungnir", "Andúril", "Stormbreaker"], correct: "Mjölnir" }
    ],
    biologyYEC: [
      { q: "According to Genesis, God created all life in how many days?", answers: ["6 days", "7 days", "1000 years", "Unknown"], correct: "6 days", reference: "Genesis 1" },
      { q: "Who was the first man?", answers: ["Adam", "Noah", "Cain", "Seth"], correct: "Adam", reference: "Genesis 2:7" }
    ]
  };

  // 🎬 Load Online Trivia for Bonus Variety
  function fetchTriviaFromAPI() {
    const topics = [
      { tag: "harry_potter", target: "general" },
      { tag: "mythology", target: "mythology" },
      { tag: "science", target: "creatures" }
    ];
    topics.forEach(({ tag, target }) => {
      fetch(`https://the-trivia-api.com/api/questions?limit=5&tags=${tag}`)
        .then(res => res.json())
        .then(data => {
          const formatted = data.map(item => ({
            q: item.question,
            correct: item.correctAnswer,
            answers: [...item.incorrectAnswers, item.correctAnswer].sort(() => Math.random() - 0.5)
          }));
          quizData[target].push(...formatted);
        });
    });
  }

  fetchTriviaFromAPI();

  // 🎬 Title Screen Button Logic
  window.startGameNow = function () {
    document.getElementById("titleScreen").style.display = "none";
    document.getElementById("intro").classList.remove("hidden");
  };

  // 🎮 Event Listeners
  document.getElementById("startBtn").addEventListener("click", startGame);
  document.getElementById("submitSorting").addEventListener("click", finalizeHouse);
  document.getElementById("savePortrait").addEventListener("click", savePortrait);
  document.getElementById("toggleTheme").addEventListener("click", () => document.body.classList.toggle("light"));
  document.getElementById("viewVault").addEventListener("click", showVault);
  document.getElementById("openSpellbook").addEventListener("click", showSpells);
  document.getElementById("openPotionLab").addEventListener("click", showPotions);
  document.getElementById("toggleFullscreen").addEventListener("click", () => {
    if (!/Mobi|Android/i.test(navigator.userAgent)) {
      !document.fullscreenElement ? document.documentElement.requestFullscreen() : document.exitFullscreen();
    } else alert("Fullscreen only available on desktop.");
  });

  document.getElementById("startQuizBtn").addEventListener("click", () => {
    document.getElementById("startQuizBtn").classList.add("hidden");
    loadQuestion();
  });

  function startGame() {
    const name = document.getElementById("username").value.trim();
    const pass = document.getElementById("password").value.trim();
    if (!/^[a-zA-Z]+ [a-zA-Z]+$/.test(name)) return alert("Enter your full name (First Last)");
    if (forbiddenNames.includes(name.toLowerCase())) return alert("That name is legendary!");
    if (!pass) return alert("Enter a password.");

    const users = JSON.parse(localStorage.getItem("playerProfiles") || "{}");
    const key = name.toLowerCase();
    if (users[key]) {
      if (users[key].password !== pass) return alert("Incorrect password.");
      currentUser = users[key];
      score = currentUser.score || 0;
      resumeQuiz();
      launchGame();
    } else {
      currentUser = {
        name,
        password: pass,
        house: null,
        score: 0,
        spells: [],
        artifacts: [],
        portrait: {},
        lastChallengeDate: null,
        quizState: {}
      };
      users[key] = currentUser;
      localStorage.setItem("playerProfiles", JSON.stringify(users));
      showSorting();
    }
  }

  function showSorting() {
    document.getElementById("intro").classList.add("hidden");
    document.getElementById("sortingHat").classList.remove("hidden");

    const questions = [
      { q: "How do you approach a challenge?", answers: { Gryffindor: "Leap in!", Hufflepuff: "Ask friends.", Ravenclaw: "Research first.", Slytherin: "Find a shortcut." } },
      { q: "What would others remember you for?", answers: { Gryffindor: "Courage", Hufflepuff: "Loyalty", Ravenclaw: "Wisdom", Slytherin: "Ambition" } },
      { q: "In a conflict, you:", answers: { Gryffindor: "Stand ground", Hufflepuff: "Find peace", Ravenclaw: "Analyze", Slytherin: "Control outcome" } }
    ];

    const container = document.getElementById("sortingQuestions");
    container.innerHTML = "";
    questions.forEach((q, i) => {
      const div = document.createElement("div");
      div.innerHTML = `<p><strong>${q.q}</strong></p>`;
      for (const [house, text] of Object.entries(q.answers)) {
        div.innerHTML += `<label><input type="radio" name="q${i}" value="${house}"> ${text}</label><br>`;
      }
      container.appendChild(div);
    });
  }

  function finalizeHouse() {
    const scores = { Gryffindor: 0, Hufflepuff: 0, Ravenclaw: 0, Slytherin: 0 };
    for (let i = 0; i < 3; i++) {
      const sel = document.querySelector(`input[name="q${i}"]:checked`);
      if (sel) scores[sel.value]++;
    }
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    currentUser.house = sorted[0][0];
    saveProfile();
    document.getElementById("sortingHat").classList.add("hidden");
    document.getElementById("portrait").classList.remove("hidden");
  }

  function savePortrait() {
    currentUser.portrait = {
      scarf: document.getElementById("scarfColor").value,
      wand: document.getElementById("wandCore").value,
      patronus: document.getElementById("patronus").value
    };
    saveProfile();
    document.getElementById("portrait").classList.add("hidden");
    launchGame();
  }

  function launchGame() {
    document.getElementById("game").classList.remove("hidden");
    document.getElementById("house").textContent = currentUser.house;
    document.getElementById("score").textContent = score;
    showOwl();
    showChallenge();
  }

  function loadQuestion(category = null, specific = null) {
    category = category || document.getElementById("quizSelector").value;
    const pool = quizData[category];
    if (!pool?.length) return alert("No questions available.");

    let q;
    let attempts = 0;
    do {
      q = pool[Math.floor(Math.random() * pool.length)];
      attempts++;
    } while ((q === previousQuestion || (currentUser.quizState?.answered || []).includes(q.q)) && attempts < 10);

    previousQuestion = q;
    currentUser.quizState = {
      category,
      question: q.q,
      answered: [...(currentUser.quizState.answered || []), q.q]
    };
    saveProfile();

    document.getElementById("question").textContent = q.q;
    const box = document.getElementById("answers");
    box.innerHTML = "";
    q.answers.forEach(answer => {
      const btn = document.createElement("button");
      btn.textContent = answer;
      btn.onclick = () => handleAnswer(q, answer);
      box.appendChild(btn);
    });

    if (q.reference) {
      const ref = document.createElement("p");
      ref.textContent = `📖 Reference: ${q.reference}`;
      ref.style.fontStyle = "italic";
      box.appendChild(ref);
    }
  }

   function handleAnswer(q, choice) {
    const fb = document.getElementById("feedback");
    if (choice === q.correct) {
      fb.textContent = "✅ Correct!";
      score += 10;
      document.getElementById("score").textContent = score;
      tryArtifact();
      updateVault();
    } else {
      fb.textContent = "❌ Incorrect!";
    }
    setTimeout(() => {
      fb.textContent = "";
      loadQuestion();
    }, 1200);
  }

  function tryArtifact() {
    const artifacts = ["Time Turner", "Cloak of Invisibility", "Marauder’s Map"];
    const owned = currentUser.artifacts || [];
    const available = artifacts.filter(a => !owned.includes(a));
    if (Math.random() > 0.75 && available.length) {
      const newOne = available[Math.floor(Math.random() * available.length)];
      owned.push(newOne);
      currentUser.artifacts = owned;
      document.getElementById("artifact-name").textContent = newOne;
      document.getElementById("artifact-section").classList.remove("hidden");
      setTimeout(() => {
        document.getElementById("artifact-section").classList.add("hidden");
      }, 3000);
      saveProfile();
    }
  }

  function updateVault() {
    const initials = currentUser.name.split(" ").map(n => n[0]).join("").toUpperCase();
    const vault = JSON.parse(localStorage.getItem("highScores") || "[]");
    vault.push({ initials, house: currentUser.house, score });
    vault.sort((a, b) => b.score - a.score);
    localStorage.setItem("highScores", JSON.stringify(vault.slice(0, 5)));
  }

  function showVault() {
    const vault = JSON.parse(localStorage.getItem("highScores") || "[]");
    const table = document.getElementById("vault-table");
    table.innerHTML = "";
    vault.forEach((entry, i) => {
      const row = document.createElement("tr");
      row.innerHTML = `<td>${i + 1}</td><td>${entry.initials}</td><td>${entry.house}</td><td>${entry.score}</td>`;
      table.appendChild(row);
    });
    document.getElementById("vault").classList.remove("hidden");
  }

  function showOwl() {
    const owls = [
      "🧙 McGonagall: 'Transfiguration requires concentration.'",
      "✨ Dumbledore: 'Words are our most inexhaustible source of magic.'",
      "🐉 Hagrid: 'You're a wizard… probably!'"
    ];
    const pick = owls[Math.floor(Math.random() * owls.length)];
    document.getElementById("owlMessage").textContent = pick;
    document.getElementById("owlPost").classList.remove("hidden");
  }

  function showChallenge() {
    const today = new Date().toDateString();
    if (currentUser.lastChallengeDate === today) return;
    const challenges = [
      "Score 30 points today.",
      "Play 3 questions in Magic & Spells.",
      "Unlock an artifact.",
      "Brew a potion and cast a spell."
    ];
    const pick = challenges[Math.floor(Math.random() * challenges.length)];
    currentUser.lastChallengeDate = today;
    currentUser.currentChallenge = pick;
    document.getElementById("challengeText").textContent = pick;
    document.getElementById("dailyChallenge").classList.remove("hidden");

    document.getElementById("completeChallenge").onclick = () => {
      alert("🌟 Challenge complete!");
      document.getElementById("dailyChallenge").classList.add("hidden");
      saveProfile();
    };
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

  function showPotions() {
    const grid = document.getElementById("potionGrid");
    grid.innerHTML = "";
    const ingredients = ["Moondew", "Mandrake Root", "Dragon Scale", "Phoenix Feather"];
    ingredients.forEach(ing => {
      const el = document.createElement("div");
      el.textContent = ing;
      el.onclick = () => brew(ing);
      grid.appendChild(el);
    });
    document.getElementById("potionResult").textContent = "";
    document.getElementById("potionLab").classList.remove("hidden");
  }

  function brew(ingredient) {
    const result = {
      "Moondew": "🧪 Elixir of Calm (slows timer)",
      "Mandrake Root": "🌿 Memory Draft (replay a question)",
      "Dragon Scale": "🔥 Strength Elixir (+10 points)",
      "Phoenix Feather": "✨ Revive (undo incorrect answer)"
    };
    document.getElementById("potionResult").textContent = result[ingredient] || "🧪 Unknown effect.";
    saveProfile();
  }

  function saveProfile() {
    const data = JSON.parse(localStorage.getItem("playerProfiles") || "{}");
    data[currentUser.name.toLowerCase()] = { ...currentUser, score };
    localStorage.setItem("playerProfiles", JSON.stringify(data));
  }

  function resumeQuiz() {
    const quiz = currentUser.quizState || {};
    if (quiz.category && quiz.question) {
      const resume = confirm("Resume your previous quiz?");
      if (resume) {
        document.getElementById("startQuizBtn").classList.add("hidden");
        loadQuestion(quiz.category, quiz.question);
      }
    }
  }
});
