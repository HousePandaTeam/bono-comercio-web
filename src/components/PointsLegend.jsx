export default function PointsLegend({ colors }) {
  return (
    <div className='mb-2 overflow-x-auto'>
      <div className='flex items-center gap-3 text-xs text-gray-700 min-w-max'>
        {Object.entries(colors).map(([label, color]) => (
          <div key={label} className='flex items-center gap-1'>
            <span
              style={{
                background: color,
                width: 10,
                height: 10,
                borderRadius: 9999,
                display: "inline-block",
                boxShadow: "0 0 0 1px rgba(0,0,0,0.25)",
              }}
            />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
