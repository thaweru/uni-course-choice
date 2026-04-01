const courses = [
  {
    title: "Computer Science",
    minScore: 78,
    subjects: ["Math", "Physics", "ICT"],
    campus: "Metro Tech University"
  },
  {
    title: "Software Engineering",
    minScore: 80,
    subjects: ["Math", "ICT", "English"],
    campus: "National Digital Institute"
  },
  {
    title: "Data Science",
    minScore: 83,
    subjects: ["Math", "Statistics", "ICT"],
    campus: "Future Analytics College"
  },
  {
    title: "Electrical Engineering",
    minScore: 76,
    subjects: ["Math", "Physics", "Chemistry"],
    campus: "Central Engineering Faculty"
  },
  {
    title: "Architecture",
    minScore: 74,
    subjects: ["Math", "Art", "Physics"],
    campus: "City School of Design"
  },
  {
    title: "Business Information Systems",
    minScore: 70,
    subjects: ["ICT", "Accounting", "Economics"],
    campus: "Commerce and Tech Academy"
  }
];

const form = document.querySelector("#search-form");
const resultsNode = document.querySelector("#results");
const summaryNode = document.querySelector("#result-summary");

function normalizeSubject(value) {
  return value.trim().toLowerCase();
}

function computeMatchScore(course, studentScore, subjects) {
  const subjectMatches = course.subjects.filter((subject) =>
    subjects.includes(normalizeSubject(subject))
  ).length;

  const scoreDistance = Math.abs(studentScore - course.minScore);
  const scorePoints = Math.max(0, 40 - scoreDistance);
  const subjectPoints = subjectMatches * 20;
  const eligibilityBonus = studentScore >= course.minScore ? 10 : 0;

  return scorePoints + subjectPoints + eligibilityBonus;
}

function renderResults(resultSet, query) {
  summaryNode.textContent = `${resultSet.length} programs ranked for score ${query.score}`;

  if (!resultSet.length) {
    resultsNode.innerHTML = `
      <div class="empty-state">
        No results found. Try different subjects or a different score.
      </div>
    `;
    return;
  }

  resultsNode.innerHTML = resultSet
    .map(
      (course, index) => `
        <article class="result-card">
          <div class="result-card__top">
            <div>
              <div class="rank-badge">Rank #${index + 1}</div>
              <h3>${course.title}</h3>
              <p class="result-meta">${course.campus}</p>
            </div>
            <div class="score-badge">${course.matchScore} pts</div>
          </div>
          <div class="subject-list">
            ${course.subjects
              .map((subject) => `<span class="subject-pill">${subject}</span>`)
              .join("")}
          </div>
          <p class="result-meta">Recommended minimum score: ${course.minScore}</p>
        </article>
      `
    )
    .join("");
}

function runSearch() {
  const score = Number(document.querySelector("#score").value);
  const subjects = [
    document.querySelector("#subject-1").value,
    document.querySelector("#subject-2").value,
    document.querySelector("#subject-3").value
  ]
    .map(normalizeSubject)
    .filter(Boolean);

  const rankedResults = courses
    .map((course) => ({
      ...course,
      matchScore: computeMatchScore(course, score, subjects)
    }))
    .filter((course) => course.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore || a.minScore - b.minScore);

  renderResults(rankedResults, { score, subjects });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  runSearch();
});

runSearch();
