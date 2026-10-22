import React from "react";

interface GeometryFigureProps {
  svgContent?: string;
  className?: string;
  alt?: string;
}

/**
 * GeometryFigure: Safe, responsive SVG renderer for 2D/3D geometry diagrams
 * (Cubes, Circles, Prisms, Viewports, Net unfolding, Angles, Lines).
 */
export const GeometryFigure: React.FC<GeometryFigureProps> = ({
  svgContent,
  className = "",
  alt = "几何示意图"
}) => {
  if (!svgContent || !svgContent.trim().startsWith("<svg")) {
    return null;
  }

  // Sanitize SVG against harmful scripts or tags
  const sanitized = svgContent
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "");

  return (
    <div
      className={`geometry-figure-wrapper flex items-center justify-center p-3 my-2 bg-slate-50/80 rounded-xl border border-slate-200/80 shadow-inner overflow-hidden ${className}`}
      role="img"
      aria-label={alt}
    >
      <div
        className="w-full max-w-[420px] max-h-[300px] flex items-center justify-center [&>svg]:w-full [&>svg]:h-auto [&>svg]:text-slate-800"
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    </div>
  );
};
