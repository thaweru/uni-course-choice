const form = document.querySelector("#search-form");
const scoreInput = document.querySelector("#score");
const streamSelect = document.querySelector("#subject-stream");
const districtSelect = document.querySelector("#district");
const prioritizeSelectedStreamInput = document.querySelector("#prioritize-selected-stream");
const resultsNode = document.querySelector("#results");
const summaryNode = document.querySelector("#result-summary");
const themeToggle = document.querySelector("#theme-toggle");
const themeMedia = window.matchMedia("(prefers-color-scheme: dark)");

let courseRows = [];
let districtHeaders = [];

function getPreferredTheme() {
  const savedTheme = window.localStorage.getItem("theme-preference");
  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  return themeMedia.matches ? "dark" : "light";
}

function updateThemeToggle(theme, source) {
  const nextTheme = theme === "dark" ? "Light" : "Dark";
  themeToggle.textContent = `Switch to ${nextTheme} Mode`;
  themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
  themeToggle.title = source === "system" ? "Following system theme" : "Using saved theme preference";
}

function applyTheme(theme, source) {
  document.body.dataset.theme = theme;
  updateThemeToggle(theme, source);
}

function initializeTheme() {
  const savedTheme = window.localStorage.getItem("theme-preference");
  const theme = getPreferredTheme();
  applyTheme(theme, savedTheme ? "saved" : "system");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    };

    return entities[character];
  });
}

function normalizeValue(value) {
  return value.trim().toLowerCase();
}

function getDisplayStreamName(stream) {
  return stream.trim() || "Common Stream";
}

function isCommonStream(stream) {
  const normalized = normalizeValue(stream);
  return !normalized || normalized === "common" || normalized === "common stream";
}

function matchesSelectedStream(courseStream, selectedStream) {
  return isCommonStream(courseStream) || normalizeValue(courseStream) === normalizeValue(selectedStream);
}

function isExactStreamMatch(courseStream, selectedStream) {
  return normalizeValue(courseStream) === normalizeValue(selectedStream);
}

function findHeaderIndex(headers, expectedName) {
  return headers.findIndex((header) => normalizeValue(header) === normalizeValue(expectedName));
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === "\"") {
      const nextCharacter = line[index + 1];
      if (insideQuotes && nextCharacter === "\"") {
        current += "\"";
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (character === "," && !insideQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current.trim());
  return values;
}

function parseCourseTable(csvText) {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return { rows: [], districts: [] };
  }

  const headers = parseCsvLine(lines[0]);
  const streamIndex = findHeaderIndex(headers, "Stream");
  const courseIndex = findHeaderIndex(headers, "Course");
  const universityIndex = findHeaderIndex(headers, "University");

  if ([streamIndex, courseIndex, universityIndex].some((index) => index < 0)) {
    return { rows: [], districts: [] };
  }

  const districts = headers.filter((_, index) => ![streamIndex, courseIndex, universityIndex].includes(index));

  const rows = lines.slice(1).map((line) => {
    const columns = parseCsvLine(line);
    const districtCutoffs = {};

    districts.forEach((district) => {
      const districtIndex = headers.indexOf(district);
      const value = Number.parseFloat(columns[districtIndex]);
      districtCutoffs[district] = Number.isFinite(value) ? value : null;
    });

    return {
      stream: columns[streamIndex] || "",
      course: columns[courseIndex] || "",
      university: columns[universityIndex] || "",
      districtCutoffs
    };
  });

  return { rows, districts };
}

function populateFilters() {
  const streamOptions = [...new Set(courseRows.map((row) => row.stream).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));

  streamSelect.innerHTML = streamOptions
    .map((stream, index) => {
      const selected = index === 0 ? " selected" : "";
      return `<option value="${escapeHtml(stream)}"${selected}>${escapeHtml(stream)}</option>`;
    })
    .join("");

  districtSelect.innerHTML = districtHeaders
    .map((district, index) => {
      const selected = index === 0 ? " selected" : "";
      return `<option value="${escapeHtml(district)}"${selected}>${escapeHtml(district)}</option>`;
    })
    .join("");
}

function getEligibilityStatus(score, cutoff) {
  const difference = score - cutoff;
  return {
    difference,
    isEligible: difference >= 0
  };
}

function renderResults(resultSet, query) {
  summaryNode.textContent = `${resultSet.length} programs match ${query.stream} in ${query.district} for score ${query.score.toFixed(3)}`;

  if (!resultSet.length) {
    resultsNode.innerHTML = `
      <div class="empty-state">
        No eligible programs were found for ${escapeHtml(query.stream)} in ${escapeHtml(query.district)} at score ${escapeHtml(query.score.toFixed(3))}.
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
              <h3>${escapeHtml(course.course)}</h3>
              <p class="result-meta">${escapeHtml(course.university)}</p>
            </div>
            <div class="score-badge">+${course.margin.toFixed(3)}</div>
          </div>
          <div class="subject-list">
            <span class="subject-pill">${escapeHtml(getDisplayStreamName(course.stream))}</span>
            <span class="subject-pill">${escapeHtml(query.district)}</span>
            <span class="subject-pill">Cutoff ${course.cutoff.toFixed(3)}</span>
            <span class="subject-pill">Your Score ${query.score.toFixed(3)}</span>
          </div>
          <p class="result-meta">Eligible by ${course.margin.toFixed(3)} points above the district cutoff.</p>
        </article>
      `
    )
    .join("");
}

function runSearch() {
  const score = Number.parseFloat(scoreInput.value);
  const selectedStream = streamSelect.value;
  const selectedDistrict = districtSelect.value;
  const prioritizeSelectedStream = prioritizeSelectedStreamInput.checked;

  if (!Number.isFinite(score) || !selectedStream || !selectedDistrict) {
    summaryNode.textContent = "Enter a score, stream, and district to search.";
    resultsNode.innerHTML = `
      <div class="empty-state">
        Enter valid search inputs to see eligible programs.
      </div>
    `;
    return;
  }

  const rankedResults = courseRows
    .filter((course) => matchesSelectedStream(course.stream, selectedStream))
    .map((course) => {
      const cutoff = course.districtCutoffs[selectedDistrict];
      const eligibility = getEligibilityStatus(score, cutoff);
      const exactStreamMatch = isExactStreamMatch(course.stream, selectedStream);

      return {
        ...course,
        cutoff,
        margin: eligibility.difference,
        isEligible: eligibility.isEligible,
        exactStreamMatch
      };
    })
    .filter((course) => Number.isFinite(course.cutoff) && course.isEligible)
    .sort((left, right) => {
      if (prioritizeSelectedStream && !isCommonStream(selectedStream) && left.exactStreamMatch !== right.exactStreamMatch) {
        return left.exactStreamMatch ? -1 : 1;
      }

      return right.cutoff - left.cutoff || left.university.localeCompare(right.university);
    });

  renderResults(rankedResults, {
    score,
    stream: selectedStream,
    district: selectedDistrict
  });
}

function initializeCourseData() {
  const csvText = typeof window.courseTableCsv === "string" ? window.courseTableCsv : "";
  const parsedTable = parseCourseTable(csvText);

  courseRows = parsedTable.rows;
  districtHeaders = parsedTable.districts;

  if (!courseRows.length || !districtHeaders.length) {
    summaryNode.textContent = "Course data could not be loaded.";
    resultsNode.innerHTML = `
      <div class="empty-state">
        The course table is missing or invalid. Check the separate data file and reload the page.
      </div>
    `;
    form.querySelector('button[type="submit"]').disabled = true;
    streamSelect.disabled = true;
    districtSelect.disabled = true;
    scoreInput.disabled = true;
    return;
  }

  populateFilters();
  runSearch();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  runSearch();
});

themeToggle.addEventListener("click", () => {
  const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
  window.localStorage.setItem("theme-preference", nextTheme);
  applyTheme(nextTheme, "saved");
});

themeMedia.addEventListener("change", (event) => {
  const savedTheme = window.localStorage.getItem("theme-preference");
  if (savedTheme) {
    return;
  }

  applyTheme(event.matches ? "dark" : "light", "system");
});

prioritizeSelectedStreamInput.addEventListener("change", runSearch);

initializeTheme();
initializeCourseData();
