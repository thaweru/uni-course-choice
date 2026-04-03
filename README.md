# Course Choice Finder

This project is a static browser app for checking which university programs are suitable for a student based on three inputs:

- score
- subject stream
- district

The site compares the entered score against district-specific cutoff values stored in a separate data file.

## Project Files

- `index.html`: Page structure, search form, results area, and theme toggle.
- `style.css`: Layout, responsive styling, and light/dark theme variables.
- `course-data.js`: Separate course table source.
- `script.js`: Theme setup, table parsing, filter population, eligibility search, and result rendering.

## Data File Format

The course data is stored separately in `course-data.js` as a CSV-style table string assigned to `window.courseTableCsv`.

The table is expected to use this shape:

```text
Stream,Course,University,COLOMBO,GAMPAHA,...,RATNAPURA
```

Each row represents one program entry for one university. The district columns contain the cutoff score for that program in that district.

Example row:

```text
Physical Science,Computer Science,University of Colombo,1.940,1.915,...,1.684
```

## How Search Works

When the page loads:

1. The app initializes the saved or system theme.
2. The app reads `window.courseTableCsv` from `course-data.js`.
3. The CSV text is parsed into course rows.
4. Subject stream and district dropdowns are populated from the parsed data.
5. A search is run using the default form values.

## Search Logic

The search form collects:

- `score`
- `subject stream`
- `district`
- optional ranking toggle for placing selected-stream courses above common-stream courses

The app then:

1. Filters the course table to rows where `Stream` matches the selected stream, and also includes rows where the stream is blank or marked as `Common`/`Common Stream`.
2. Reads the cutoff from the selected district column.
3. Marks a course as eligible if `score >= district cutoff`.
4. Removes ineligible rows.
5. Sorts eligible rows by higher district cutoff first.

If the ranking toggle is enabled and the selected stream is not `Common`/`Common Stream`, exact stream matches are shown before common-stream matches. Selecting `Common Stream` keeps the normal ranking by cutoff.

This means the highest ranked result is the most competitive eligible program in the selected stream and district.

## Results

Each result card shows:

- rank
- course
- stream
- university
- selected district
- district cutoff
- entered score
- margin above cutoff

If no courses are eligible, the app shows an empty-state message instead.

## Theme Behavior

The site still supports light and dark mode.

- If the user has saved a theme preference in `localStorage`, that preference is used.
- Otherwise, the site follows the system color scheme.
- Clicking the theme button saves the chosen theme locally.

## Updating the Course Table

To replace the sample data:

1. Open `course-data.js`.
2. Replace the CSV rows inside `window.courseTableCsv`.
3. Keep the header names as `Stream`, `Course`, and `University`. Every remaining column is treated as a district, using the exact header text as the dropdown label.
4. Reload the page.
