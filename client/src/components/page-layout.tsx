import { cn } from "@/lib/utils";
import PageHeader from "./page-header";

interface PropsType {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
  showHeader?: boolean;
  addMarginTop?: boolean;
}

const PageLayout = ({
  children,
  className,
  title,
  subtitle,
  rightAction,
  showHeader = true,
  addMarginTop = false
}: PropsType) => {
  return (
    <div>
      {showHeader && (
        <PageHeader
          title={title}
          subtitle={subtitle}
          rightAction={rightAction}
        />
      )}
      <div
        className={cn(
          "w-full max-w-[var(--max-width)] mx-auto pt-8 px-4 sm:px-6",
          addMarginTop && "-mt-20",
          className
        )}
      >
        <div className="card p-6">{children}</div>
      </div>
    </div>
  );
};

export default PageLayout;
