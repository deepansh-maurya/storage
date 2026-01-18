import { PROTECTED_ROUTES } from "@/routes/common/routePath";
import { Link } from "react-router-dom";

const Logo = (props: { url?: string }) => {
  return (
    <Link
      to={props.url || PROTECTED_ROUTES.OVERVIEW}
      className="flex items-center gap-3"
    >
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
        <span className="text-white font-extrabold">ND</span>
      </div>
      <div>
        <h1 className="select-none font-bold text-lg lg:text-2xl tracking-tight">
          <span className="sr-only">NimbusDrive</span>
          <span className="text-foreground">
            Nimbus<span className="text-primary">Drive</span>
          </span>
        </h1>
      </div>
    </Link>
  );
};

export default Logo;
