import logoSvg from "@/assets/images/messenger-logo.svg";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface LogoProps {
  url?: string;
  text?: string;
  imgClass?: string;
  textClass?: string;
}

const Logo = ({
  url = "/",
  text = "",
  imgClass = "size-[30px]",
  textClass,
}: LogoProps) => {
  return (
    <Link to={url} className="flex items-center gap-2 w-fit">
      <img src={logoSvg} alt="Messenger" className={cn(imgClass)} />
      {text && (
        <span className={cn("font-semibold text-lg leading-tight", textClass)}>
          {text}
        </span>
      )}
    </Link>
  );
};

export default Logo;
