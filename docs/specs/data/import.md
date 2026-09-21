# Import

## Route

| Legacy | React |
|---|---|
| `#/Import` | `/imports` |

Evidence: `Views/Import/Index.cshtml:1-22`, `_Layout.cshtml:124`

## Permissions

| Gate | Needs | Evidence |
|---|---|---|
| Page and menu | Import + Access | `ImportController.cs:15` |
| Validate File | Import + Access | `ImportApiController.cs:261-263` |
| Process File | Import + Add (React hides the button without it) | `ImportApiController.cs:50-52` |

## Fields

| Label | Control | Rules | Evidence |
|---|---|---|---|
| Import Type | Select, placeholder "Select" | Required; options from GET `ImportApi/GetImportTypes` | `seats-file-importer.html:154-162` |
| Get sample file | Link, new tab, shown once a type is picked | GET `ImportApi/GetImportFileSample/{id}` | `seats-file-importer.html:164-166, 352` |
| File | Drop zone "Select or Drop File Here", `.csv` | Required; MIME `text/csv` or `application/vnd.ms-excel` | `seats-file-importer.html:146-151, 306-309` |

## Actions

| Button | Request | Result | Evidence |
|---|---|---|---|
| Validate File | PUT `ImportApi/validateFile`, multipart `selectedImportTypeId` + `file` | Rows → errors grid + info "The file data is invalid…"; none → success "The file is valid…" | `seats-file-importer.html:364-469` |
| Process File | PUT `ImportApi/UploadFile`, same form | Success "The file has been uploaded and will be processed soon", file cleared; error shows server `message` | `seats-file-importer.html:355-393` |

Checks before sending, in order: "Select import type", "Select file", FileNotSupported (`seats-file-importer.html:479-497`).

## Errors grid

- Heading "The imported file is not valid. Fix the next errors:"; columns Line Number, Exception Info, both sortable; client paging (`seats-file-importer.html:185-205, 394-409`).
- The server returns at most 100 rows (`ImportApiController.cs:272`).

## React notes

- Design: Guided steps (A), chosen by Gautham on 2026-09-15.
- Toasts: 6 s for info and success, 5 s for errors, as legacy.
- Safe mode blocks both PUTs and says so.

## Checklist

- [x] Route, menu link, Import + Access gate
- [x] Import types list and sample link
- [x] CSV drop zone with MIME check
- [x] Validate File with errors grid (sort + paging)
- [x] Process File with Import + Add
- [x] Server messages and legacy toast texts
- [ ] Real Alpha data check (needs sign-in; local Import service dependency)
