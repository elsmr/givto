import type { SVGProps } from 'react';

// Same drawing as public/givto-logo.svg; data-part names the pieces for animation (12). The
// transform origins are in viewBox units: the tips pivot on the box's outer bottom corners, the
// body squashes from its base, the shadow and face parts scale about their own centres.
export const GivtoLogo = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 144 144"
    stroke="#111111"
    strokeWidth="4"
    {...props}
  >
    <g data-part="tip-left" style={{ transformOrigin: '0px 136px' }}>
      <g data-part="tip-right" style={{ transformOrigin: '136px 136px' }}>
        <rect
          data-part="shadow"
          x="10"
          y="10"
          width="132"
          height="132"
          fill="#5A51FF"
          style={{ transformOrigin: '76px 142px' }}
        />
        <g data-part="body" style={{ transformOrigin: '68px 136px' }}>
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
            <g
              data-part="eyes"
              fill="#111111"
              stroke="none"
              style={{ transformOrigin: '49px 64px' }}
            >
              <circle cx="27" cy="64" r="6" />
              <circle cx="71" cy="64" r="6" />
            </g>
            <path
              data-part="mouth"
              fill="#5A51FF"
              d="M33 78h32a16 12 0 0 1-32 0z"
              style={{ transformOrigin: '49px 78px' }}
            />
          </g>
        </g>
      </g>
    </g>
  </svg>
);
