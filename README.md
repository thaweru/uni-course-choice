# Course Choice Finder

This project is a static browser app for checking which university programs are suitable for a student based on three inputs:

- score
- subject stream
- district

The site compares the entered score against district-specific cutoff values stored in yearly CSV files, while using a separate course catalog CSV to determine which streams can search each course.

## Project Files

- `index.html`: Page structure, search form, results area, and theme toggle.
- `style.css`: Layout, responsive styling, and light/dark theme variables.
- `2025_cutoff.csv`: Primary cutoff table for the current search year.
- `cources.csv`: Course catalog used to determine stream eligibility for user searches.
- `script.js`: Theme setup, table parsing, filter population, eligibility search, and result rendering.

## Data File Format

The app now reads two CSV sources directly in the browser:

- yearly cutoff tables such as `2025_cutoff.csv`
- the course catalog `cources.csv`

The cutoff table is expected to use this shape:

```text
Course,University,Stream,COLOMBO,GAMPAHA,...,RATNAPURA
```

Each row represents one program entry for one university. The district columns contain the cutoff score for that program in that district.

Example row:

```text
Computer Science,University of Colombo,Physical Science,1.940,1.915,...,1.684
```

The course catalog is expected to include the header row starting with:

```text
Course Code,Course of Study,Stream,University Letter,...,Art Eligible,Commerce Eligible,Biological Science Eligible,...
```

The app uses the catalog to decide which user stream options can search a course, even when the yearly cutoff file has blank or inconsistent stream values.

## How Search Works

When the page loads:

1. The app initializes the saved or system theme.
2. The app fetches `cources.csv` and the configured yearly cutoff CSV files.
3. The course catalog is parsed into search eligibility metadata.
4. The primary yearly cutoff table is parsed into course rows.
5. The two sources are joined by normalized course name.
6. Subject stream and district dropdowns are populated from the joined data.
7. A search is run using the default form values.

## Search Logic

The search form collects:

- `score`
- `subject stream`
- `district`
- optional ranking toggle for placing selected-stream courses above common-stream courses

The app then:

1. Filters the joined course list to rows whose catalog entry allows the selected user stream.
2. Reads the cutoff from the selected district column.
3. Marks a course as eligible if `score >= district cutoff`.
4. Removes ineligible rows.
5. Sorts eligible rows by higher district cutoff first.

If the ranking toggle is enabled, courses whose primary stream exactly matches the selected stream are shown before broader common-stream matches.

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

## Updating the CSV Files

To replace or extend the data:

1. Update `2025_cutoff.csv` for the main cutoff source. Keep `Course`, `University`, and `Stream` headers, and use district names for the remaining columns.
2. Update `cources.csv` for course catalog metadata. Keep the line-2 header row and the `... Eligible` columns used for stream matching.
3. If you add another year, add another entry to `cutoffDatasets` in `script.js`.
4. Reload the page through a local static server so the browser can fetch the CSV files.
