export default function Loading() {
  return (
    <div
      className="craft-loading"
      aria-live="polite"
      aria-label="Đang tải dữ liệu làng nghề"
    >
      <div className="pottery-loader" aria-hidden="true">
        <span className="pottery-vessel" />
        <span className="pottery-wheel" />
        <span className="pottery-hand pottery-hand-left" />
        <span className="pottery-hand pottery-hand-right" />
      </div>
      <strong>Đang tạo tác trải nghiệm…</strong>
      <span>Một chút kiên nhẫn cho câu chuyện thủ công.</span>
    </div>
  );
}
