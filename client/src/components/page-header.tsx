import { ReactNode } from "react";

interface PageHeaderProps {
  title?: string;
  subtitle?: string;
  rightAction?: ReactNode;
}

const PageHeader = ({ title, subtitle, rightAction }: PageHeaderProps) => {
  return (
    <div className="w-full px-5 lg:px-0 text-foreground">
      <div className="w-full mx-auto max-w-[var(--max-width)]">
        <div className="w-full flex flex-col gap-3 items-start justify-start lg:items-center lg:flex-row lg:justify-between py-4 border-b border-transparent">
          {(title || subtitle) && (
            <div className="space-y-0">
              {title && (
                <h1 className="break-normal font-semibold text-lg sm:text-2xl text-foreground">
                  {title}
                </h1>
              )}
              {subtitle && <p className="text-muted text-sm">{subtitle}</p>}
            </div>
          )}
          {rightAction && <div className="mt-3 lg:mt-0">{rightAction}</div>}
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
