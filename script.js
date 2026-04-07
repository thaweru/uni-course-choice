const form = document.querySelector("#search-form");
const scoreInput = document.querySelector("#score");
const streamSelect = document.querySelector("#subject-stream");
const districtSelect = document.querySelector("#district");
const prioritizeSelectedStreamInput = document.querySelector("#prioritize-selected-stream");
const resultsNode = document.querySelector("#results");
const summaryNode = document.querySelector("#result-summary");
const themeToggle = document.querySelector("#theme-toggle");
const themeMedia = window.matchMedia("(prefers-color-scheme: dark)");

const cutoffDatasets = [
  { year: "2025", path: "2025_cutoff.csv", isPrimary: true }
];

const courseCatalogPath = "cources.csv";
const streamDefinitions = [
  { label: "Art", catalogHeader: "Art Eligible", aliases: ["art"] },
  { label: "Commerce", catalogHeader: "Commerce Eligible", aliases: ["commerce"] },
  { label: "Biological Science", catalogHeader: "Biological Science Eligible", aliases: ["biological science", "bio sci"] },
  { label: "Physical Science", catalogHeader: "Physical Science Eligible", aliases: ["physical science", "phy sci"] },
  { label: "Engineering Technology", catalogHeader: "Engieneering Technology Eligible", aliases: ["engineering technology", "eng tech", "eng. tech."] },
  { label: "Biosystems Technology", catalogHeader: "Biosystems Technology Eligible", aliases: ["biosystems technology", "bio tech", "bio tech."] }
];
const cutoffCourseAliases = {
  "AGRI BUSINESS MANAGEMENT": "AGRIBUSINESS MANAGEMENT",
  "ARTS": "ARTS INCLUDING ADDITIONAL INTAKE",
  "ARTS SAB A": "ARTS SAB",
  "ARTS SAB B": "ARTS SAB",
  "INFORMATION COMMUNICATION TECHNOLOGY": "INFORMATION AND COMMUNICATION TECHNOLOGY ICT",
  "MANAGEMENT STUDIES TV A": "MANAGEMENT STUDIES TV",
  "MANAGEMENT STUDIES TV B": "MANAGEMENT STUDIES TV",
  "MARINE AND FRESHWATER SCIENCES": "MARINE AND FRESH WATER SCIENCES"
};

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
  return String(value || "").trim().toLowerCase();
}

function normalizeCourseName(value) {
  const normalized = String(value || "")
    .toUpperCase()
    .replace(/&/g, " AND ")
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();

  return cutoffCourseAliases[normalized] || normalized;
}

function getDisplayStreamName(stream) {
  return String(stream || "").trim() || "Common Stream";
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

function getLines(csvText) {
  return csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function fetchText(path) {
  return fetch(path).then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to load ${path} (${response.status})`);
    }

    return response.text();
  });
}

function parseCutoffTable(csvText, year) {
  const lines = getLines(csvText);

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
      year,
      stream: columns[streamIndex] || "",
      course: columns[courseIndex] || "",
      university: columns[universityIndex] || "",
      normalizedCourseName: normalizeCourseName(columns[courseIndex]),
      districtCutoffs
    };
  });

  return { rows, districts };
}

function getStreamLabelFromAlias(value) {
  const normalizedValue = normalizeValue(value);

  return streamDefinitions.find((streamDefinition) =>
    streamDefinition.aliases.some((alias) => normalizeValue(alias) === normalizedValue)
  )?.label || null;
}

function deriveEligibleStreamsFromCatalog(columns, headerIndexMap) {
  const eligibleStreams = streamDefinitions
    .filter((streamDefinition) => {
      const columnIndex = headerIndexMap.get(normalizeValue(streamDefinition.catalogHeader));
      return columnIndex !== undefined && normalizeValue(columns[columnIndex]) === "yes";
    })
    .map((streamDefinition) => streamDefinition.label);

  return [...new Set(eligibleStreams)];
}

function deriveFallbackStreams(stream) {
  const mainStreamLabel = getStreamLabelFromAlias(stream);

  if (mainStreamLabel) {
    return [mainStreamLabel];
  }

  const normalizedStream = normalizeValue(stream);
  if (!normalizedStream) {
    return [];
  }

  if (normalizedStream === "common" || normalizedStream === "common stream") {
    return streamDefinitions.map((streamDefinition) => streamDefinition.label);
  }

  return [stream.trim()];
}

function getExactStreamLabels(stream) {
  const mainStreamLabel = getStreamLabelFromAlias(stream);

  return mainStreamLabel ? [mainStreamLabel] : [];
}

function parseCourseCatalog(csvText) {
  const lines = getLines(csvText);
  const headerLineIndex = lines.findIndex((line) => line.includes("Course Code") && line.includes("Course of Study"));

  if (headerLineIndex < 0) {
    return new Map();
  }

  const headers = parseCsvLine(lines[headerLineIndex]);
  const headerIndexMap = new Map(headers.map((header, index) => [normalizeValue(header), index]));
  const codeIndex = findHeaderIndex(headers, "Course Code");
  const nameIndex = findHeaderIndex(headers, "Course of Study");
  const streamIndex = findHeaderIndex(headers, "Stream");

  if ([codeIndex, nameIndex, streamIndex].some((index) => index < 0)) {
    return new Map();
  }

  const metadataByCourseName = new Map();

  lines.slice(headerLineIndex + 1).forEach((line) => {
    const columns = parseCsvLine(line);
    const courseCode = columns[codeIndex] || "";

    if (!/^\d+$/.test(courseCode)) {
      return;
    }

    const courseName = columns[nameIndex] || "";
    const mainStream = columns[streamIndex] || "";
    const eligibleStreams = deriveEligibleStreamsFromCatalog(columns, headerIndexMap);
    const normalizedCourseName = normalizeCourseName(courseName);
    const existing = metadataByCourseName.get(normalizedCourseName);
    const mergedEligibleStreams = new Set([...(existing?.eligibleStreams || []), ...eligibleStreams]);

    metadataByCourseName.set(normalizedCourseName, {
      courseName,
      normalizedCourseName,
      mainStream: existing?.mainStream || mainStream,
      eligibleStreams: [...mergedEligibleStreams]
    });
  });

  return metadataByCourseName;
}

function attachSearchMetadata(cutoffRows, courseCatalog) {
  return cutoffRows.map((row) => {
    const metadata = courseCatalog.get(row.normalizedCourseName);
    const eligibleStreams = metadata?.eligibleStreams.length
      ? metadata.eligibleStreams
      : deriveFallbackStreams(metadata?.mainStream || row.stream);
    const primaryStream = metadata?.mainStream || row.stream;
    const exactStreamLabels = getExactStreamLabels(primaryStream);

    return {
      ...row,
      eligibleStreams,
      primaryStream,
      exactStreamLabels
    };
  });
}

function populateFilters() {
  const streamOptions = [...new Set(courseRows.flatMap((row) => row.eligibleStreams).filter(Boolean))]
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
            <span class="subject-pill">${escapeHtml(getDisplayStreamName(course.primaryStream))}</span>
            <span class="subject-pill">${escapeHtml(query.district)}</span>
            <span class="subject-pill">${escapeHtml(course.year)} cutoff ${course.cutoff.toFixed(3)}</span>
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
    .filter((course) => course.eligibleStreams.some((stream) => normalizeValue(stream) === normalizeValue(selectedStream)))
    .map((course) => {
      const cutoff = course.districtCutoffs[selectedDistrict];
      const eligibility = getEligibilityStatus(score, cutoff);
      const exactStreamMatch = course.exactStreamLabels.some((stream) => normalizeValue(stream) === normalizeValue(selectedStream));

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
      if (prioritizeSelectedStream && left.exactStreamMatch !== right.exactStreamMatch) {
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

function disableSearchForm() {
  form.querySelector('button[type="submit"]').disabled = true;
  streamSelect.disabled = true;
  districtSelect.disabled = true;
  scoreInput.disabled = true;
  prioritizeSelectedStreamInput.disabled = true;
}

function showDataLoadError(message) {
  summaryNode.textContent = "Course data could not be loaded.";
  resultsNode.innerHTML = `
    <div class="empty-state">
      ${escapeHtml(message)}
    </div>
  `;
  disableSearchForm();
}

async function initializeCourseData() {
  summaryNode.textContent = "Loading course data...";
  resultsNode.innerHTML = `
    <div class="empty-state">
      Loading course catalog and cutoff tables.
    </div>
  `;

  try {
    const [courseCatalogText, ...cutoffTexts] = await Promise.all([
      fetchText(courseCatalogPath),
      ...cutoffDatasets.map((dataset) => fetchText(dataset.path))
    ]);

    const courseCatalog = parseCourseCatalog(courseCatalogText);
    const cutoffTables = cutoffTexts.map((csvText, index) => parseCutoffTable(csvText, cutoffDatasets[index].year));
    const primaryCutoffIndex = cutoffDatasets.findIndex((dataset) => dataset.isPrimary);
    const primaryCutoffTable = cutoffTables[primaryCutoffIndex >= 0 ? primaryCutoffIndex : 0];

    courseRows = attachSearchMetadata(primaryCutoffTable.rows, courseCatalog);
    districtHeaders = primaryCutoffTable.districts;

    if (!courseRows.length || !districtHeaders.length) {
      showDataLoadError("The CSV files are missing, invalid, or do not contain usable course data.");
      return;
    }

    populateFilters();
    runSearch();
  } catch (error) {
    const message = error instanceof Error
      ? `${error.message}. If you opened the page directly from the file system, run it through a local static server so the browser can read the CSV files.`
      : "The CSV files could not be loaded.";

    showDataLoadError(message);
  }
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
