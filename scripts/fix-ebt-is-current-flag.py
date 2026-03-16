#!/usr/bin/env python3
"""
Fix missing AND ebt.is_current_flag = 'Y' on EBT joins across all YAML metric definitions.

Operates on raw text to preserve formatting, comments, and multi-line strings.
Two transformation targets per file:
  A. source_tables join_on strings for EBT entries
  B. formula_sql LEFT JOIN ON clauses for EBT

Usage:
  python3 scripts/fix-ebt-is-current-flag.py           # dry-run (shows diffs)
  python3 scripts/fix-ebt-is-current-flag.py --apply    # write changes
"""

import os
import re
import sys

METRICS_DIR = os.path.join(os.path.dirname(__file__), "calc_engine", "metrics")

# Pattern A: source_tables join_on for EBT
# Matches: join_on: "ebt.managed_segment_id = fm.lob_segment_id"
# Also:    join_on: "ebt_l3.managed_segment_id = fm.lob_segment_id"
# Does NOT match if line already contains is_current_flag
JOIN_ON_PATTERN = re.compile(
    r'(join_on:\s*")'                           # prefix: join_on: "
    r'(ebt(?:_l[123])?\.managed_segment_id'     # ebt alias + .managed_segment_id
    r'\s*=\s*'                                   # = with optional spaces
    r'(?:fm\.lob_segment_id|ebt_l[123]\.parent_segment_id))'  # target field
    r'(")',                                      # closing quote
    re.IGNORECASE
)

# Pattern B: formula_sql ON clause for EBT
# Matches: ON ebt.managed_segment_id = fm.lob_segment_id
# Also:    ON  ebt_l3.managed_segment_id = fm.lob_segment_id
EBT_ON_PATTERN = re.compile(
    r'^(\s*ON\s+)'                              # leading whitespace + ON
    r'(ebt(?:_l[123])?)'                        # capture alias
    r'(\.managed_segment_id\s*=\s*'             # .managed_segment_id =
    r'(?:fm\.lob_segment_id|ebt_l[123]\.parent_segment_id))'  # target
    r'(\s*)$',                                   # trailing whitespace
    re.IGNORECASE | re.MULTILINE
)


def fix_join_on(content: str) -> tuple[str, int]:
    """Fix source_tables join_on strings for EBT entries."""
    count = 0

    def replacer(m):
        nonlocal count
        full = m.group(0)
        if "is_current_flag" in full:
            return full  # already has the flag
        prefix = m.group(1)
        condition = m.group(2)
        suffix = m.group(3)
        # Extract alias from condition
        alias_match = re.match(r'(ebt(?:_l[123])?)', condition, re.IGNORECASE)
        alias = alias_match.group(1) if alias_match else "ebt"
        count += 1
        return f"{prefix}{condition} AND {alias}.is_current_flag = 'Y'{suffix}"

    result = JOIN_ON_PATTERN.sub(replacer, content)
    return result, count


def fix_formula_sql_on(content: str) -> tuple[str, int]:
    """Fix formula_sql LEFT JOIN ON clauses for EBT."""
    lines = content.split('\n')
    new_lines = []
    count = 0

    i = 0
    while i < len(lines):
        line = lines[i]
        m = EBT_ON_PATTERN.match(line)

        if m and "is_current_flag" not in line:
            # Check if the NEXT line already has is_current_flag for this alias
            alias = m.group(2)
            next_has_flag = False
            if i + 1 < len(lines):
                next_line = lines[i + 1]
                if f"{alias}.is_current_flag" in next_line:
                    next_has_flag = True

            if not next_has_flag:
                # Get indentation from the ON keyword
                indent = m.group(1)
                # Calculate the indent for AND line (align with ON or slightly indented)
                on_indent_len = len(indent) - len(indent.lstrip())
                and_indent = ' ' * on_indent_len + '  AND '

                # Append the original ON line (strip trailing whitespace, add newline)
                new_lines.append(line.rstrip())
                # Add the AND is_current_flag line
                new_lines.append(f"{and_indent}{alias}.is_current_flag = 'Y'")
                count += 1
                i += 1
                continue

        new_lines.append(line)
        i += 1

    return '\n'.join(new_lines), count


def process_file(filepath: str, apply: bool) -> dict:
    """Process a single YAML file. Returns stats."""
    with open(filepath, 'r') as f:
        original = f.read()

    content = original

    # Fix A: source_tables join_on
    content, join_on_fixes = fix_join_on(content)

    # Fix B: formula_sql ON clauses
    content, formula_fixes = fix_formula_sql_on(content)

    total = join_on_fixes + formula_fixes

    if total > 0 and apply:
        with open(filepath, 'w') as f:
            f.write(content)

    return {
        "file": os.path.basename(filepath),
        "join_on_fixes": join_on_fixes,
        "formula_fixes": formula_fixes,
        "total": total,
        "changed": content != original,
    }


def main():
    apply = "--apply" in sys.argv

    if not apply:
        print("DRY RUN — use --apply to write changes\n")

    all_stats = []
    for root, dirs, files in sorted(os.walk(METRICS_DIR)):
        for fname in sorted(files):
            if not fname.endswith('.yaml'):
                continue
            filepath = os.path.join(root, fname)
            stats = process_file(filepath, apply)
            all_stats.append(stats)

    # Summary
    modified = [s for s in all_stats if s["total"] > 0]
    skipped = [s for s in all_stats if s["total"] == 0]

    print(f"{'APPLIED' if apply else 'WOULD APPLY'} changes to {len(modified)} files:")
    for s in modified:
        print(f"  {s['file']}: {s['join_on_fixes']} join_on + {s['formula_fixes']} formula_sql = {s['total']} fixes")

    print(f"\nSkipped {len(skipped)} files (already correct or no EBT joins):")
    for s in skipped:
        print(f"  {s['file']}")

    total_fixes = sum(s["total"] for s in all_stats)
    print(f"\nTotal fixes: {total_fixes} across {len(modified)} files")

    if not apply and total_fixes > 0:
        print("\nRun with --apply to write changes.")


if __name__ == "__main__":
    main()
