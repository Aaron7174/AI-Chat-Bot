function StatsCard({ label, value, accent = 'blue' }) {
  return (
    <div className={`stats-card ${accent}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default StatsCard;
