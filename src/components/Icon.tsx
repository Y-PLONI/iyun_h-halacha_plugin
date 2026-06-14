import { ICON_EM, ICON_PATHS, type IconName } from '../icons/fluent';

// אייקוני FluentUI System Icons (סט האייקונים של אוצריא), מוטמעים כ-SVG inline.
// fill="currentColor" — יורש את צבע ה-theme מהאלמנט העוטף, כמו בתוסף הסידור.
// ה-glyph מוגדר ב-Y-up (font units), לכן הופכים אותו עם matrix(1 0 0 -1 0 EM).

interface IconProps {
  name: IconName;
  /** גודל יחסי לגופן (em). ברירת מחדל 1.25em כמו ב-fi-svg של אוצריא. */
  size?: string;
  title?: string;
}

export function Icon({ name, size, title }: IconProps) {
  const d = ICON_PATHS[name];
  if (!d) return null;
  return (
    <svg
      className="fi-svg"
      viewBox={`0 0 ${ICON_EM} ${ICON_EM}`}
      fill="currentColor"
      style={size ? { width: size, height: size } : undefined}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path transform={`matrix(1 0 0 -1 0 ${ICON_EM})`} d={d} />
    </svg>
  );
}
