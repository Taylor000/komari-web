import { IconButton } from "@radix-ui/themes";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { Link } from "react-router-dom";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import LoginDialog from "./Login";
import { useTranslation } from "react-i18next";
const NavBar = () => {
  const { publicInfo } = usePublicInfo();
  const { t } = useTranslation();
  return (
    <nav className="nav-bar flex rounded-b-lg items-center gap-2 md:gap-3 max-h-16 justify-end min-w-full p-2 px-4">
      <div className="mr-auto flex items-center min-w-0">
        <Link to="/" className="flex items-center min-w-0">
          <span className="font-bold text-[clamp(1.25rem,5vw,1.875rem)] whitespace-nowrap truncate leading-tight">
            {publicInfo?.sitename}
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <IconButton
          variant="soft"
          onClick={() => {
            window.open("https://github.com/komari-monitor", "_blank");
          }}
        >
          <GitHubLogoIcon />
        </IconButton>

        {publicInfo?.private_site && !document.cookie.includes("temp_key") && (
          <LoginDialog
            autoOpen={
              publicInfo?.private_site && !document.cookie.includes("temp_key")
            }
            info={t("common.private_site")}
            onLoginSuccess={() => {
              window.location.reload();
            }}
          />
        )}
      </div>
    </nav>
  );
};

export default NavBar;
