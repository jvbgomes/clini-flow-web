import './Pagination.css';

function getPageList(page, totalPages) {
  const visible = new Set([1, totalPages]);
  for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
    visible.add(i);
  }
  const sorted = [...visible].sort((a, b) => a - b);
  const list = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) list.push({ type: 'ellipsis', key: `e${i}` });
    list.push({ type: 'page', value: p, key: `p${p}` });
  });
  return list;
}

export default function Pagination({ page, totalPages, onPageChange, from, to, total }) {
  if (totalPages <= 1 && total <= 20) return null;

  return (
    <div className="pagination">
      <span className="pagination-info">
        {total === 0 ? 'No results' : `Showing ${from}–${to} of ${total}`}
      </span>
      <div className="pagination-controls">
        <button className="page-btn" onClick={() => onPageChange(page - 1)} disabled={page === 1}>‹</button>
        {getPageList(page, totalPages).map(item =>
          item.type === 'ellipsis'
            ? <span key={item.key} className="page-ellipsis">…</span>
            : (
              <button
                key={item.key}
                className={`page-btn${item.value === page ? ' active' : ''}`}
                onClick={() => onPageChange(item.value)}
              >
                {item.value}
              </button>
            )
        )}
        <button className="page-btn" onClick={() => onPageChange(page + 1)} disabled={page === totalPages}>›</button>
      </div>
    </div>
  );
}
