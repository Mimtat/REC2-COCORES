# Updated REC² map files

Replace these paths in your existing GitHub repository with the files in this ZIP:

- materials/REC2_example_data.xlsx
- scripts/build_data.py
- docs/index.html
- docs/app.js
- docs/data.json
- .github/workflows/github_pages.yml

The workflow now reads materials/REC2_example_data.xlsx. Keep GitHub Pages Source set to GitHub Actions. Commit all replacements together to main.

The workbook contains seven sheets: Themes, Cases, Teams, Members, Collaboration stages, Publications, Keywords. Headers are in row 5; instructions above are ignored by the converter.

Use semicolons between multiple theme, author and keyword IDs. Publication records require at least one author, a publication year, and exactly one case ID. All referenced IDs must exist. Dates are yyyy-mm-dd; end dates are exclusive. A blank collaboration-stage end date means ongoing. Retain past stage rows when recording a change.

The map shows team-case involvement and its current stage at quarter end. Cases shown for members are inherited through their team's involvement; this does not establish individual participation or direct team-to-team collaboration. Coauthor connections are derived only from publication author IDs. A shared case alone is not displayed as confirmed coauthorship.

Publication collaboration start/end dates are stored separately from publication year. The current schema has no publication status field or author-specific participation dates. Members inherit institution and discipline from Teams. Individual dates are unknown where blank; do not interpret earlier timeline views as confirmed historical presence for undated records.

Emails are excluded from generated website data. Only for an appropriately access-controlled internal deployment, use --include-internal-email with the converter.

Local preview:
python -m pip install openpyxl==3.1.5
python scripts/build_data.py materials/REC2_example_data.xlsx docs/data.json
python -m http.server 8000 --directory docs

The supplied stage transitions and record counts were checked locally; live GitHub deployment and browser visual testing were not run here.

## Network views

The homepage now includes a layered, draggable network. docs/gephi_network.html is a second viewer adapted from your Sigma/Gephi source, with moving layout, Pause/Space controls, pan/zoom, layer filters, quarterly dates, and click details. Both read docs/data.json generated from the workbook; no manual Gephi export is required. The Sigma viewer loads pinned dependencies from jsDelivr and therefore needs internet access. The homepage network works without those dependencies.

Theme-case links, team-case stages, membership, authorship, publication-case links and keywords are distinct relationships. Team-case involvement does not establish direct collaboration between teams. Stage periods are end-exclusive. Keywords appear when referenced by publications in the homepage network; the Sigma viewer also shows unlinked keyword records. No sample publications or keywords have been invented. Node positions and circle sizes carry no analytical meaning.

Upload all ZIP paths to the repository root, preserving folders. The extra network is accessible at /gephi_network.html on the published site; the homepage links to it. JavaScript syntax and data consistency were checked locally. The adapted viewers have not been visually verified in a browser.
