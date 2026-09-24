# REC² collaboration map

The Excel workbook is the data source. The website reads `docs/data.json`, which is generated from the workbook. Themes, cases, links, teams, people, publications and keywords are no longer written inside JavaScript.

## Quarterly update

1. Edit `materials/REC2_data_template.xlsx`. Keep entity IDs stable.
2. Add new teams, people, outputs, keywords or relationship rows. Enter `end_date` on a relationship when it stops; do not repeat unchanged rows each quarter. An end date is the first day that relationship is inactive.
3. Add a row to `Publication Status` for every status change, with its effective date. Keep earlier rows to preserve the timeline.
4. Commit the edited workbook to the repository's `main` branch. The workflow builds fresh JSON and deploys the website, once GitHub Pages has been configured to use GitHub Actions.

The slider displays the state at the end of each quarter. Blank dates mean that the historical start is unknown; they should not be interpreted as evidence that a relationship existed in every earlier quarter. The blank template contains only the six RAP themes and six case labels. The project must enter and verify the actual links.

## Local preview

Install Python and `openpyxl`, then run from the repository root:

```
python -m pip install openpyxl==3.1.5
python scripts/build_data.py materials/REC2_data_template.xlsx docs/data.json
python -m http.server 8000 --directory docs
```

Open `http://localhost:8000`. Opening `index.html` directly as a local file may prevent the browser from loading `data.json`.

## GitHub Pages setup

In the repository's Pages settings, select **GitHub Actions** as the publishing source. The included workflow builds the JSON when the workbook or site files change on `main`, then deploys the `docs` folder. Review access and contact-data policy before enabling a public site. GitHub Pages deployment is not an internal access-control system merely because the repository is private.

The build excludes all email addresses by default. A separate access-controlled internal deployment can include emails marked `Internal map` by calling the converter with `--include-internal-email`. It omits source notes from the published JSON.

## Files

- `materials/REC2_data_template.xlsx`: canonical project records and dated links.
- `materials/REC2_concept_note.docx`: pitch note.
- `materials/REC2_participant_questionnaire.docx`: draft data collection form.
- `scripts/build_data.py`: Excel to JSON converter with ID validation.
- `docs/index.html`, `docs/app.js`, `docs/data.json`: website and generated data.
- `.github/workflows/github_pages.yml`: automated build and deployment.

Theme colors approximate the RAP image provided for the project. No actual researcher identities, publications or theme-to-case assignments were supplied for the template.
