# Course Choice Finder

This project is a small static website that helps a student compare their score and subjects against a predefined list of university programs. Everything runs in the browser. There is no backend, database, or API call.

## Files

- `index.html`: Defines the page layout, form inputs, results area, and theme toggle button.
- `style.css`: Controls the retro-inspired layout, colors, responsive behavior, and light/dark theme variables.
- `script.js`: Stores the course dataset and handles theme setup, form submission, ranking logic, and result rendering.

## How the Website Works

When the page loads, `script.js` does two things immediately:

1. It initializes the theme with `initializeTheme()`.
2. It runs a default search with `runSearch()` using the values already filled into the form.

Because of this, the user sees ranked course cards as soon as the page opens.

## User Flow

1. The user enters a score.
2. The user enters three subjects.
3. The user clicks `Run Search`.
4. The form submit handler prevents a normal page refresh.
5. The app calculates a match score for each course.
6. Matching courses are sorted from best match to worst match.
7. The results section is rebuilt with ranked course cards.

## Course Data

The available programs are stored in the `courses` array inside `script.js`.

Each course object contains:

- `title`: Name of the degree/program.
- `minScore`: Recommended minimum score.
- `subjects`: Subjects associated with that program.
- `campus`: Institution name shown in the result card.

To add or remove programs, edit the `courses` array.

## Search and Ranking Logic

The main search logic is handled by `runSearch()`.

### Input Processing

- The score is read from the `#score` input and converted to a number.
- The three subject fields are collected into an array.
- Each subject is normalized with `normalizeSubject()`, which trims whitespace and converts text to lowercase.
- Empty subject values are removed.

This normalization means entries like `Math`, ` math `, and `MATH` are treated the same.

### Match Score Calculation

Each course receives a numeric score from `computeMatchScore(course, studentScore, subjects)`.

The formula is:

- Subject match points: `20` points for each matching subject.
- Score proximity points: `40 - abs(studentScore - course.minScore)`, with a minimum of `0`.
- Eligibility bonus: `10` extra points if the student's score is greater than or equal to the course's `minScore`.

So the total is:

```text
matchScore = scorePoints + subjectPoints + eligibilityBonus
```

### Filtering and Sorting

After scores are calculated:

- Courses with `matchScore <= 0` are removed.
- The remaining courses are sorted by:
  1. Higher `matchScore` first
  2. Lower `minScore` first when scores are tied

This means the top-ranked result is the strongest overall match under the current scoring model.

## Results Rendering

`renderResults()` updates two parts of the page:

- `#result-summary`: Shows how many programs were ranked for the entered score.
- `#results`: Displays one card per ranked program.

Each result card shows:

- Rank number
- Course title
- Campus/institution
- Total match points
- Subject tags
- Recommended minimum score

If no results remain after filtering, the app renders an empty-state message instead.

## Theme System

The light/dark theme behavior is handled entirely in the browser.

### Initial Theme Choice

`getPreferredTheme()` checks for a saved value in `localStorage` under the key `theme-preference`.

- If a saved value exists and is `light` or `dark`, that value is used.
- Otherwise, the app follows the user's system theme through `prefers-color-scheme`.

### Theme Toggle

When the user clicks the theme button:

- The theme flips between `light` and `dark`.
- The new value is saved in `localStorage`.
- `document.body.dataset.theme` is updated.
- Button text and accessibility state are updated.

### System Theme Changes

If the user has not manually saved a theme, the site will respond to system theme changes in real time through a media query listener.

## Styling and Layout

The layout is built around:

- `.app-shell` as the main page container
- `.hero` for the top introduction area
- `.panel` sections for inputs and results
- `.result-card` for each ranked course

The CSS uses custom properties for colors, which makes theme switching simple. The dark theme works by overriding those variables on `body[data-theme="dark"]`.

The layout is also responsive:

- The form uses CSS grid with auto-fitting columns.
- The theme button becomes full width on smaller screens.
- Cards wrap content when horizontal space is limited.

## Current Technical Characteristics

- Static frontend only
- No external data loading
- No form submission to a server
- No client-side routing
- No build step required

You can run the site by opening `index.html` directly in a browser.

## Customization Notes

Common changes can be made here:

- Add more courses: edit the `courses` array in `script.js`
- Change ranking behavior: edit `computeMatchScore()` in `script.js`
- Change default input values: edit the form input `value` attributes in `index.html`
- Change colors or spacing: edit CSS variables and component rules in `style.css`
- Change theme storage key or behavior: edit the theme functions in `script.js`

## Limitation

The recommendation system is based on a simple hardcoded scoring model. It does not validate real university admission rules, required subject combinations, or live course availability.
