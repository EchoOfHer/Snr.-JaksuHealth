# Task Assignments for `feature/web-refactor-results`

This branch handles UI improvements and result filtering for the JaksuHealth Web Application.

## 📝 For Jirawat (Frontend & UI)
- [x] **Increase Label Sizes:** Make the text for stats (Severity, Confidence, Total Lesions) and table headers/rows larger and more readable. (Completed in `App.css`)
- [x] **Confidence Footnote:** Add a footnote explaining that the Confidence score is the average pixel-wise probability of the AI for all detected lesions. (Completed in `AnalysisPanel.jsx`)
- [ ] **Verify UI Responsiveness:** Check if the larger labels and tables still look good on smaller laptop screens or tablets without breaking the layout.
- [ ] **PDF Report Check:** Ensure the new label sizes or removed anatomical features do not break the generated PDF layout (`ReportTemplate.jsx`). 

## 📝 For Natthawut (Backend & Data Logic)
- [x] **Filter Anatomical Features:** Remove `OpticDisc` and `Macula` from the frontend results table so that the list *only* shows actual lesions (Exudates, Hemorrhages, Drusen). (Completed via frontend filtering in `AnalysisPanel.jsx`)
- [ ] **Backend Payload Optimization (Optional):** Currently, the anatomical features are filtered out in the frontend. Consider removing them from the backend `endpoints.py` payload if they are no longer needed for any downstream process, to save bandwidth.
- [ ] **Test Real Model Predictions:** Run the updated UI with the actual `SegFormer_best_model.pth` backend to ensure the confidence calculation matches the new footnote description correctly in edge cases (e.g., when no lesions are found).
