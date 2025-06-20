import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://ijxnlsywdbpzbrqiqubs.supabase.co';
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE'; // Replace with your actual anon key
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

function startGameNow() {
  loadQuestion();
}

document.addEventListener('DOMContentLoaded', () => {
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

  async function loadQuestion() {
    try {
      const res = await fetch(`https://the-trivia-api.com/api/questions?limit=15&categories=${encodeURIComponent(currentUser.quizCategory)}`);
      const questions = await res.json();
      if (questions.length !== 15) throw new Error();
      startQuiz(questions);
    } catch {
      document.getElementById('feedback').textContent = '⚠️ Failed to load quiz. Please try again later.';
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
    const initials = currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase();
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
    } else {
      data.forEach((entry, i) => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${i + 1}</td><td>${entry.initials}</td><td>${entry.house}</td><td>${entry.score}</td>`;
        table.appendChild(row);
      });
    }
  }

  function tryArtifact() {
    const list = ['Cloak of Invisibility', 'Time Turner', 'Marauder’s Map'];
    const pool = list.filter(a => !currentUser.artifacts.includes(a));
    if (Math.random() > 0.75 && pool.length) {
      const newArtifact = pool[Math.floor(Math.random() * pool.length)];
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
      { name: 'Protego', effect: 'Block wrong answer' }
    ];
    const available = allSpells.filter(s => !currentUser.spells.some(p => p.name === s.name));
    if (Math.random() > 0.8 && available.length) {
      const newSpell = available[Math.floor(Math.random() * available.length)];
      currentUser.spells.push(newSpell);
      alert(`✨ New spell unlocked: ${newSpell.name}`);
    }
  }

  function brew(ingredient) {
    const effects = {
      'Moondew': '🧪 Calm Elixir (slow timer)',
      'Mandrake Root': '🌿 Memory Draft (retry)',
      'Dragon Scale': '🔥 Strength Elixir (+10 points)',
      'Phoenix Feather': '✨ Revive'
    };
    const potion = effects[ingredient];
    if (potion) {
      const name = potion.split(' ').pop().replace(/[^\w]/g, '');
      currentUser.potions.push(name);
      document.getElementById('potionResult').textContent = potion;
    }
  }

  function checkChallenge() {
    const challenge = currentUser.currentChallenge;
    if (!challenge || currentUser.challengeCompleted) return;
    if (
      (challenge.includes('30') && score >= 30) ||
      (challenge.includes('artifact') && currentUser.artifacts.length) ||
      (challenge.includes('spell') && currentUser.spells.length)
    ) {
      currentUser.challengeCompleted = true;
      alert('🌟 Challenge complete!');
    }
  }

  loadQuestion();
});
  function showVault() {
    updateVault(); // Refresh leaderboard from Supabase
    document.getElementById('vault').classList.remove('hidden');
  }

  function showPotions() {
    const grid = document.getElementById('potionGrid');
    grid.innerHTML = '';
    ['Moondew', 'Mandrake Root', 'Dragon Scale', 'Phoenix Feather'].forEach(ingredient => {
      const div = document.createElement('div');
      div.textContent = ingredient;
      div.onclick = () => brew(ingredient);
      grid.appendChild(div);
    });
    document.getElementById('potionResult').textContent = '';
    document.getElementById('potionLab').classList.remove('hidden');
  }

  function showSpells() {
    const list = document.getElementById('spellList');
    list.innerHTML = '';
    const spells = currentUser.spells || [];
    if (spells.length === 0) {
      list.innerHTML = '<li>No spells unlocked yet.</li>';
    } else {
      spells.forEach(sp => {
        const li = document.createElement('li');
        li.textContent = `${sp.name} — ${sp.effect}`;
        list.appendChild(li);
      });
    }
    document.getElementById('spellbook').classList.remove('hidden');
  }

  function showChallenge() {
    const today = new Date().toDateString();
    if (currentUser.lastChallengeDate === today) return;
    const challenges = [
      'Score 30 points today.',
      'Unlock an artifact.',
      'Brew a potion.',
      'Unlock a new spell.'
    ];
    const selected = challenges[Math.floor(Math.random() * challenges.length)];
    currentUser.lastChallengeDate = today;
    currentUser.currentChallenge = selected;
    currentUser.challengeCompleted = false;
    document.getElementById('challengeText').textContent = selected;
    document.getElementById('dailyChallenge').classList.remove('hidden');

    document.getElementById('completeChallenge').onclick = () => {
      if (currentUser.challengeCompleted) {
        alert('You’ve already completed today’s challenge!');
      } else {
        currentUser.challengeCompleted = true;
        alert('🌟 Challenge completed!');
      }
    };
  }

  // Trigger leaderboard preload and game start
  updateVault();
  loadQuestion();
});
