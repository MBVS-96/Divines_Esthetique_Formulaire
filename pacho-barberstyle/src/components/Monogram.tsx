interface Props {
  className?: string;
}

/**
 * The P monogram, sliced by the line-up cut a barber shaves at the temple.
 * Drawn in `currentColor` so it takes the colour of whatever it sits in.
 * Outlines, not text — no font needed. Source: `brand/generate.py`.
 */
export function Monogram({ className }: Props) {
  return (
    <svg
      viewBox="0 0 512 512"
      className={className}
      role="img"
      aria-label="Pacho Barberstyle"
      fill="currentColor"
    >
      <defs>
        <mask id="pbs-monogram">
          <rect width="512" height="512" fill="black" />
          <path d="M190.64 127.0H260.29Q295.56 127 313.19 145.92Q330.82 164.84 330.82 201.39V231.06Q330.82 267.61 313.19 286.53Q295.56 305.45 260.29 305.45H237.94V428.0H190.64ZM260.29 262.45Q271.90 262.45 277.71 256.0Q283.52 249.55 283.52 234.07V198.38Q283.52 182.9 277.71 176.45Q271.90 170 260.29 170.0H237.94V262.45Z" fill="white" />
          <g transform="rotate(-24 256 256)">
            <rect x="-4" y="216" width="520" height="26" fill="black" />
          </g>
        </mask>
      </defs>
      <rect width="512" height="512" mask="url(#pbs-monogram)" />
    </svg>
  );
}
