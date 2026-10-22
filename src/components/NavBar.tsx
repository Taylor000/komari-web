import { IconButton } from "@radix-ui/themes";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { Link } from "react-router-dom";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import LoginDialog from "./Login";
import { useTranslation } from "react-i18next";
import { Activity } from "lucide-react";
const NavBar = () => {
  const { publicInfo } = usePublicInfo();
  const { t } = useTranslation();
  return (
    <nav className="nav-bar">
      <div className="mr-auto flex items-center min-w-0">
        <Link to="/" className="nav-brand">
          <span className="nav-brand-mark" aria-hidden="true">
            <Activity size={16} strokeWidth={2.4} />
          </span>
          <span className="nav-brand-name">{publicInfo?.sitename}</span>
        </Link>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <IconButton
          variant="ghost"
          color="gray"
          className="nav-icon-button"
          aria-label="GitHub"
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
