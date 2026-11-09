import { headingFont } from '../../styles/fonts';

// Exposes the next/font family to CSS (styles/globals.css --font-heading).
export const HeadingFont = () => (
  <style jsx global>{`
    :root {
      --font-heading-family: ${headingFont.style.fontFamily};
    }
  `}</style>
);
