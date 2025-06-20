// Get Supabase client from global (set in index.html)
const supabaseClient = window.supabaseClient;

// Initialize game state
let score = 0;
let currentUser = {
  name: 'Guest',
  house: 'Hufflepuff',
  artifacts: [],
  spells: [],
  potions: [],
  quizCategory: 'harry-potter',
  lastChallengeDate: '',
  currentChallenge: '',
  challengeCompleted: false
};

// Start Game button callback
function startGameNow() {
  score = 0;
  document.getElementById('score').textContent = score;
  loadQuestion();
}
async function loadQuestion() {
  try {
    const res = await fetch(
      `https://the-trivia-api.com/api/questions?limit=15&categories=${encodeURIComponent(currentUser.quizCategory)}`
    );
    const questions = await res.json();
    if (!Array.isArray(questions) || questions.length < 15) throw new Error();
    startQuiz(questions);
  } catch {
    document.getElementById('feedback').textContent = '⚠️ Failed to load quiz. Try again later.';
  }
}

function startQuiz(questions) {
  let index = 0;
  showQuestion(questions[index]);

  function showQuestion(q) {
    document.getElementById('question').textContent = q.question;
    const choices = [...q.incorrectAnswers];
    choices.splice(Math.floor(Math.random() * 4), 0, q.correctAnswer);
    const answers = document.getElementById('answers');
    answers.innerHTML = '';
    choices.forEach(c => {
      const btn = document.createElement('button');
      btn.textContent = c;
      btn.onclick = () => handleAnswer(q, c);
      answers.appendChild(btn);
    });
  }

  function handleAnswer(q, choice) {
    const fb = document.getElementById('feedback');
    if (choice === q.correctAnswer) {
      fb.textContent = '✅ Correct!';
      score += 10;
      document.getElementById('score').textContent = score;
      tryArtifact();
      tryUnlockSpell();
      checkChallenge();
    } else {
      fb.textContent = '❌ Incorrect!';
      if (currentUser.potions.includes('Revive')) {
        fb.textContent += ' ✨ Revive used!';
        currentUser.potions = currentUser.potions.filter(p => p !== 'Revive');
      }
    }

    setTimeout(() => {
      fb.textContent = '';
      index++;
      if (index < questions.length) {
        showQuestion(questions[index]);
      } else {
        alert('🎉 Quiz complete!');
        submitScore();
      }
    }, 1000);
  }
}
async function submitScore() {
  const initials = currentUser.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();

  const { error } = await supabaseClient.from('scores').insert([
    { initials, house: currentUser.house, score }
  ]);

  if (error) {
    console.error('Supabase insert error:', error.message);
  } else {
    updateVault();
  }
}

async function updateVault() {
  const { data, error } = await supabaseClient
    .from('scores')
    .select('initials, house, score')
    .order('score', { ascending: false })
    .limit(5);

  const table = document.getElementById('vault-table');
  if (!table) return;
  table.innerHTML = '';

  if (error) {
    table.innerHTML = '<tr><td colspan="4">Error loading leaderboard</td></tr>';
    return;
  }

  data.forEach((entry, i) => {
    const row = document.createElement('tr');
    row.innerHTML = `<td>${i + 1}</td><td>${entry.initials}</td><td>${entry.house}</td><td>${entry.score}</td>`;
    table.appendChild(row);
  });
}

function tryArtifact() {
  const artifacts = ['Time Turner', 'Invisibility Cloak', 'Marauder’s Map'];
  const available = artifacts.filter(a => !currentUser.artifacts.includes(a));
  if (Math.random() > 0.75 && available.length > 0) {
    const newArtifact = available[Math.floor(Math.random() * available.length)];
    currentUser.artifacts.push(newArtifact);
    document.getElementById('artifact-name').textContent = newArtifact;
    document.getElementById('artifact-section').classList.remove('hidden');
    setTimeout(() => {
      document.getElementById('artifact-section').classList.add('hidden');
    }, 3000);
  }
}

function tryUnlockSpell() {
  const allSpells = [
    { name: 'Lumos', effect: 'Reveal hint' },
    { name: 'Protego', effect: 'Block wrong answer' },
    { name: 'Accio', effect: 'Auto-correct once' }
  ];
  const ownedNames = currentUser.spells.map(s => s.name);
  const available = allSpells.filter(spell => !ownedNames.includes(spell.name));
  if (Math.random() > 0.8 && available.length > 0) {
    const newSpell = available[Math.floor(Math.random() * available.length)];
    currentUser.spells.push(newSpell);
    alert(`✨ New spell unlocked: ${newSpell.name}`);
  }
}
