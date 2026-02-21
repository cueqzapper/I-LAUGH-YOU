from __future__ import annotations

import argparse
import math
import re
from dataclasses import dataclass
from pathlib import Path

PIECE_CONFIG_PATH = Path(__file__).resolve().parents[1] / "src" / "lib" / "piece-config.ts"
CONST_PATTERN = re.compile(r"export const (PIECE_COLUMNS|PIECE_ROWS)\s*=\s*(\d+);")


@dataclass(frozen=True)
class Grid:
    rows: int
    columns: int

    @property
    def total(self) -> int:
        return self.rows * self.columns

    @property
    def ratio(self) -> float:
        return self.columns / self.rows


@dataclass(frozen=True)
class Candidate:
    total: int
    rows: int
    columns: int
    ratio_delta: float
    total_delta: int


def load_current_grid(config_path: Path) -> Grid:
    text = config_path.read_text(encoding="utf-8")
    values: dict[str, int] = {}

    for name, value in CONST_PATTERN.findall(text):
        values[name] = int(value)

    missing = {"PIECE_COLUMNS", "PIECE_ROWS"} - set(values)
    if missing:
        missing_fields = ", ".join(sorted(missing))
        raise ValueError(f"Missing constants in {config_path}: {missing_fields}")

    return Grid(rows=values["PIECE_ROWS"], columns=values["PIECE_COLUMNS"])


def find_best_grid_for_total(total: int, target_ratio: float) -> tuple[int, int, float]:
    best: tuple[float, int, int] | None = None

    for divisor in range(1, int(math.sqrt(total)) + 1):
        if total % divisor != 0:
            continue

        other = total // divisor
        rows, columns = (divisor, other) if divisor <= other else (other, divisor)
        ratio_delta = abs((columns / rows) - target_ratio)

        if best is None:
            best = (ratio_delta, rows, columns)
            continue

        best_ratio_delta, best_rows, best_columns = best
        if ratio_delta < best_ratio_delta:
            best = (ratio_delta, rows, columns)
            continue

        if math.isclose(ratio_delta, best_ratio_delta, rel_tol=0.0, abs_tol=1e-12):
            current_balance = abs(columns - rows)
            best_balance = abs(best_columns - best_rows)
            if current_balance < best_balance:
                best = (ratio_delta, rows, columns)

    if best is None:
        raise ValueError(f"Could not compute a grid for total={total}")

    ratio_delta, rows, columns = best
    return rows, columns, ratio_delta


def build_candidates(current: Grid, minimum: int, maximum: int, step: int) -> list[Candidate]:
    candidates: list[Candidate] = []

    for total in range(minimum, maximum + 1):
        if total % step != 0:
            continue

        rows, columns, ratio_delta = find_best_grid_for_total(total, current.ratio)
        candidates.append(
            Candidate(
                total=total,
                rows=rows,
                columns=columns,
                ratio_delta=ratio_delta,
                total_delta=abs(total - current.total),
            )
        )

    return sorted(
        candidates,
        key=lambda item: (
            item.total_delta,
            item.ratio_delta,
            abs(item.columns - current.columns) + abs(item.rows - current.rows),
            item.total,
        ),
    )


def format_int(value: int) -> str:
    return f"{value:,}"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Find sell-friendly piece totals and matching row/column grids."
    )
    parser.add_argument("--min", type=int, default=5000, dest="minimum")
    parser.add_argument("--max", type=int, default=30000, dest="maximum")
    parser.add_argument(
        "--step",
        type=int,
        default=1000,
        help="Search only totals that are multiples of this step (default: 1000).",
    )
    parser.add_argument("--top", type=int, default=8, help="How many candidates to show.")
    parser.add_argument(
        "--config",
        type=Path,
        default=PIECE_CONFIG_PATH,
        help="Path to piece-config.ts (auto-detected by default).",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if args.minimum < 1:
        raise SystemExit("--min must be at least 1")
    if args.maximum < args.minimum:
        raise SystemExit("--max must be greater than or equal to --min")
    if args.step < 1:
        raise SystemExit("--step must be at least 1")
    if args.top < 1:
        raise SystemExit("--top must be at least 1")

    current = load_current_grid(args.config)
    candidates = build_candidates(current, args.minimum, args.maximum, args.step)

    if not candidates:
        raise SystemExit("No candidates found. Try changing --min/--max/--step.")

    print("Current grid (from piece-config.ts)")
    print(f"- Rows    : {current.rows}")
    print(f"- Columns : {current.columns}")
    print(f"- Pieces  : {format_int(current.total)}")
    print()

    print("Top candidate totals")
    for index, candidate in enumerate(candidates[: args.top], start=1):
        print(
            f"{index}. {format_int(candidate.total)} pieces -> "
            f"{candidate.rows} rows x {candidate.columns} columns "
            f"(delta pieces: {format_int(candidate.total_delta)}, "
            f"ratio drift: {candidate.ratio_delta:.4f})"
        )

    best = candidates[0]
    print()
    print("Recommended sales number")
    print(
        f"{format_int(best.total)} pieces ({best.rows} rows x {best.columns} columns)"
    )
    print(
        "Reason: closest clean multiple in the selected range while preserving "
        "a similar row/column shape."
    )


if __name__ == "__main__":
    main()
