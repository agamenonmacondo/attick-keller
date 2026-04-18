interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  className?: string;
  light?: boolean;
}

export default function SectionHeading({
  title,
  subtitle,
  className = "",
  light = false,
}: SectionHeadingProps) {
  return (
    <div className={className}>
      <div
        className={`h-px w-12 ${
          light ? "bg-ak-cream/40" : "bg-ak-wine"
        }`}
      />
      <h2
        className={`mt-4 font-[Playfair_Display] text-3xl tracking-tight md:text-4xl ${
          light ? "text-ak-cream" : "text-ak-charcoal"
        }`}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={`mt-3 text-base ${
            light ? "text-ak-cream/60" : "text-ak-charcoal/60"
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}