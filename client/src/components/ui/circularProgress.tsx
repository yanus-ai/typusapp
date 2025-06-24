interface Props {
  size: number;
  fillColor: string;
  total: number;
  current: number;
  background?: string;
  className?: string;
}

const strokeWidth = 4;

const CircularProgress = (props: Props) => {
  const { size, fillColor, background, total, current, className } = props;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (current / total) * circumference;
  const halfSize = size / 2;

  const commonParams = {
    cx: halfSize,
    cy: halfSize,
    r: radius,
    fill: background || "#FFFFFF",
    strokeWidth,
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className}>
      <circle {...commonParams} stroke={background} />
      <circle
        {...commonParams}
        stroke={fillColor}
        strokeDasharray={circumference}
        strokeDashoffset={circumference - progress}
        transform={`rotate(-90 ${halfSize} ${halfSize})`}
        strokeLinecap="round"
      />
    </svg>
  );
};

export default CircularProgress;
