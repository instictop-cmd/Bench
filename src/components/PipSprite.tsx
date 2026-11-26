type PipProps = {
  awake?: boolean;
  className?: string;
  title?: string;
};

export function PipSprite({ awake = false, className = "", title }: PipProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="100%"
      height="100%"
      shapeRendering="crispEdges"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={`${awake ? "pip-awake" : ""} ${className}`}
    >
      {/* antenna */}
      <rect
        className={awake ? "pip-antenna" : ""}
        x="7"
        y="0"
        width="2"
        height="1"
        fill="#ffcf6e"
      />
      <rect x="8" y="1" width="1" height="2" fill="#4fbf90" />

      {/* ears */}
      <rect x="2" y="4" width="1" height="4" fill="#4fbf90" />
      <rect x="13" y="4" width="1" height="4" fill="#4fbf90" />

      {/* head */}
      <rect x="3" y="3" width="10" height="8" fill="#9bffcf" />
      <rect x="3" y="9" width="10" height="1" fill="#4fbf90" />

      {/* screen */}
      <rect x="4" y="4" width="8" height="5" fill="#0b1210" />

      {/* eyes */}
      {awake ? (
        <>
          <rect
            className="pip-eye"
            x="5"
            y="5"
            width="2"
            height="2"
            fill="#7dffb3"
          />
          <rect
            className="pip-eye"
            x="9"
            y="5"
            width="2"
            height="2"
            fill="#7dffb3"
          />
        </>
      ) : (
        <>
          <rect x="5" y="6" width="2" height="1" fill="#2f5c4b" />
          <rect x="9" y="6" width="2" height="1" fill="#2f5c4b" />
        </>
      )}

      {/* mouth */}
      <rect x="7" y="8" width="2" height="1" fill="#4fbf90" />

      {/* body */}
      <rect x="4" y="11" width="8" height="3" fill="#9bffcf" />
      <rect x="4" y="13" width="8" height="1" fill="#4fbf90" />

      {/* chest light */}
      <rect
        x="7"
        y="12"
        width="2"
        height="1"
        fill={awake ? "#ffcf6e" : "#6e9686"}
      />

      {/* feet */}
      <rect x="4" y="14" width="2" height="1" fill="#4fbf90" />
      <rect x="10" y="14" width="2" height="1" fill="#4fbf90" />
    </svg>
  );
}
