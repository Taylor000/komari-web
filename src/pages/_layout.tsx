import { LiveDataProvider } from "@/contexts/LiveDataContext";
import Footer from "../components/Footer";
import NavBar from "../components/NavBar";
import { Outlet } from "react-router-dom";
import { NodeListProvider } from "@/contexts/NodeListContext";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import { useIsMobile } from "@/hooks/use-mobile";

const IndexLayoutContent = () => {
    const { publicInfo } = usePublicInfo();
    const isMobile = useIsMobile();
    const bgUrlDesktop = publicInfo?.theme_settings?.backgroundImageUrlDesktop;
    const bgUrlMobile = publicInfo?.theme_settings?.backgroundImageUrlMobile;
    const bgUrl = isMobile ? bgUrlMobile || bgUrlDesktop : bgUrlDesktop;
    const mainContentWidth =
      publicInfo?.theme_settings?.mainContentWidth ?? 100;
    return (
      <>
        <div
          className={
            bgUrl
              ? "layout flex flex-col w-full min-h-screen bg-cover bg-center bg-fixed bg-no-repeat"
              : "layout flex flex-col w-full min-h-screen bg-accent-1"
          }
          style={{
            backgroundImage: bgUrl ? `url(${bgUrl})` : "none",
          }}
        >
          <main
            className="main-content m-1 h-full"
            style={{
              width: `${mainContentWidth}vw`,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            <NavBar />
            <Outlet />
          </main>
          <Footer />
        </div>
      </>
    );
};

const IndexLayout = () => (
    <LiveDataProvider>
      <NodeListProvider>
        <IndexLayoutContent />
      </NodeListProvider>
    </LiveDataProvider>
);

export default IndexLayout;
