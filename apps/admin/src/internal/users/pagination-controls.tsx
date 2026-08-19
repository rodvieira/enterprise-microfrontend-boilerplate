import { Button } from '../ui/button';

export interface PaginationControlsProps {
  page: number;
  pageCount: number;
  onNext: () => void;
  onPrevious: () => void;
}

/** Button-based prev/next. Admin-local: no other app needs this control. */
export function PaginationControls({
  page,
  pageCount,
  onNext,
  onPrevious,
}: PaginationControlsProps) {
  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={onPrevious}
        disabled={page === 0}
      >
        Previous
      </Button>
      <span className="text-sm text-(--color-text-muted)">
        Page {page + 1} of {pageCount}
      </span>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={onNext}
        disabled={page >= pageCount - 1}
      >
        Next
      </Button>
    </div>
  );
}
