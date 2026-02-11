# Generate Spec Changelog

Analyze differences between spec versions in docs/specs/ directory and generate changelog for README.md.

## Steps

1. List version folders in `docs/specs/` directory (e.g., 0.1.0, 0.1.1)
2. Read `spec.md` file from each version
3. Analyze differences between adjacent versions:
   - Added: New sections or features
   - Changed: Modified content (parameter values, descriptions, etc.)
   - Removed: Deleted sections or parameters
4. Update the Changelog section in `docs/specs/README.md`
5. Output summary of changes

## Output Format

```markdown
### {version} ({date})

**Added:**
- Description of item

**Changed:**
- Description of item

**Removed:**
- Description of item
```

## Notes

- Versions follow semantic versioning
- Date format: YYYY-MM-DD
- Write changelog entries in English
- Do NOT add Diff view links in the version table — the user will add them manually
