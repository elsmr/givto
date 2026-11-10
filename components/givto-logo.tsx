import type { SVGProps } from 'react';

// Same drawing as public/givto-logo.svg; data-part names the pieces for animation (12).
export const GivtoLogo = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 144 144"
    stroke="#111111"
    strokeWidth="4"
    {...props}
  >
    <rect
      data-part="shadow"
      x="10"
      y="10"
      width="132"
      height="132"
      fill="#5A51FF"
    />
    <rect
      data-part="box"
      x="2"
      y="2"
      width="132"
      height="132"
      fill="#FE7362"
    />
    <g data-part="ribbon" fill="#5A51FF">
      <rect x="2" y="98" width="132" height="12" />
      <rect x="96" y="2" width="12" height="132" />
    </g>
    <g data-part="face">
      <g data-part="eyes" fill="#111111" stroke="none">
        <circle cx="27" cy="64" r="6" />
        <circle cx="71" cy="64" r="6" />
      </g>
      <path
        data-part="mouth"
        fill="#5A51FF"
        d="M33 78h32a16 12 0 0 1-32 0z"
      />
    </g>
  </svg>
);
