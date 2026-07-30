import { Outlet, useLocation } from "react-router-dom";

import AdminPanelBar from "../../components/admin/AdminPanelBar";
import { useAccount } from "@/contexts/AccountContext";
import { updateSettingsWithToast, useSettings } from "@/lib/api";
import { Button, Dialog } from "@radix-ui/themes";
import { Suspense, useEffect, useState } from "react";
import { Eula } from "@/utils/field";
import Loading from "@/components/loading";

const AdminContent = () => {
  const { account } = useAccount();
  const location = useLocation();
  const loggedIn = account?.logged_in === true;
  const { settings, loading } = useSettings(loggedIn);
  const lang = localStorage.getItem("i18nextLng") || "en";
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loggedIn || loading) {
      setOpen(false);
    } else if (
      settings &&
      !settings.eula_accepted &&
      lang.startsWith("zh")
    ) {
      setOpen(true);
    }
  }, [lang, loading, loggedIn, settings]);

  const content = loggedIn ? (
    <Suspense
      key={location.pathname}
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loading text="正在加载页面…" />
        </div>
      }
    >
      <Outlet />
    </Suspense>
  ) : null;

  return (
    <>
      <Dialog.Root open={open}>
        <Dialog.Content>
          <Dialog.Title>法律声明与合规指引</Dialog.Title>
          <div className="flex flex-col gap-2">
            <div className="max-h-[70vh] overflow-y-auto space-y-4">
              <pre className="text-wrap">{Eula}</pre>
            </div>
            <div className="flex flex-row gap-2 justify-end items-center">
              <Button
                variant="soft"
                color="red"
                onClick={() => window.close()}
              >
                不接受
              </Button>
              <Button
                variant="solid"
                onClick={() => {
                  setOpen(false);
                  updateSettingsWithToast(
                    { eula_accepted: true },
                    (key) => key,
                  );
                }}
              >
                我已详细阅读并接受
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Root>
      <AdminPanelBar content={content} />
    </>
  );
};

const AdminLayout = () => <AdminContent />;

export default AdminLayout;
