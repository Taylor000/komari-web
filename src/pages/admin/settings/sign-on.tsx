import {
  SettingCardLabel,
  SettingCardShortTextInput,
  SettingCardSwitch,
} from "@/components/admin/SettingCard";
import { updateSettingsWithToast, useSettings } from "@/lib/api";
import { Button, Text } from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import Loading from "@/components/loading";
import React from "react";
import { toast } from "sonner";

export default function SignOnSettings() {
  const { t } = useTranslation();
  const { settings, loading, error } = useSettings();

  if (loading) {
    return <Loading />;
  }
  if (error) {
    return <Text color="red">{error}</Text>;
  }

  return (
    <>
      <SettingCardLabel>{t("settings.sign_on.title")}</SettingCardLabel>
      <SettingCardSwitch
        title={t("settings.sign_on.disable_password", "禁止密码登录")}
        defaultChecked={settings.disable_password_login}
        onChange={async (checked) => {
          await updateSettingsWithToast({ disable_password_login: checked }, t);
        }}
      />
      <SettingCardLabel>API</SettingCardLabel>
      <ApiCard />
    </>
  );
}

const ApiCard = () => {
  const { settings } = useSettings();
  const { t } = useTranslation();
  const [apiValues, setApiValues] = React.useState<string>(settings?.api_key || "" );

  // 生成32位随机字符串
  const generateRandomString = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'komari-';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // 处理生成按钮点击
  const handleGenerateApiKey = () => {
    const newApiKey = generateRandomString();
    setApiValues(newApiKey);
  };

  // 初始化API值
  React.useEffect(() => {
    if (settings?.api_key) {
      setApiValues(settings.api_key);
    }
  }, [settings?.api_key]);

  return (
    <SettingCardShortTextInput
        title={t("settings.api.title")}
        description={t("settings.api.description")}
        value={apiValues}
        onChange={(e) => setApiValues(e.target.value)}
        OnSave={async (values) => {
          if (!values) {
            await updateSettingsWithToast({ api_key: "" }, t);
            return;
          }
          if (values.length < 12) {
            toast.error(t("settings.api.key_length_error"));
            return;
          }
          await updateSettingsWithToast({ api_key: values }, t);
        }}
      >
        <div className="flex flex-row gap-2 justify-start items-center">
          <Button variant="soft" color="green" onClick={handleGenerateApiKey}>{t('common.generate')}</Button>
        </div>
      </SettingCardShortTextInput>
  )
}
