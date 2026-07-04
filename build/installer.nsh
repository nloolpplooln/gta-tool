; VaultGTA NSIS - Chinese Installer

; Welcome Page
!define MUI_WELCOMEPAGE_TITLE "欢迎使用 VaultGTA 安装向导"
!define MUI_WELCOMEPAGE_TEXT "VaultGTA - GTA Online 载具收藏管理器$\r$\n$\r$\n版本 ${VERSION}$\r$\n$\r$\n本向导将引导您完成 VaultGTA 的安装。$\r$\n$\r$\n建议在安装前关闭其他应用程序。"

; License Page
!define MUI_LICENSEPAGE_TEXT_TOP "安装前请阅读许可协议："
!define MUI_LICENSEPAGE_TEXT_BOTTOM "如果您接受协议条款，请点击[我同意]继续安装。"
!define MUI_LICENSEPAGE_BUTTON "我同意(&I)"

; Directory Page
!define MUI_DIRECTORYPAGE_TEXT_TOP "选择 VaultGTA 的安装位置。"
!define MUI_DIRECTORYPAGE_TEXT_DESTINATION "安装目录"

; Finish Page
!define MUI_FINISHPAGE_TITLE "VaultGTA 安装完成"
!define MUI_FINISHPAGE_TEXT "VaultGTA ${VERSION} 已成功安装。$\r$\n$\r$\n点击完成退出向导，开始管理您的 GTA 载具收藏！"
!define MUI_FINISHPAGE_LINK "VaultGTA 项目主页"
!define MUI_FINISHPAGE_LINK_LOCATION "https://github.com"
; Uninstall
!define MUI_UNWELCOMEFINISHPAGE_TITLE "卸载 VaultGTA"
!define MUI_UNWELCOMEFINISHPAGE_TEXT "本向导将从您的计算机移除 VaultGTA ${VERSION}。"
!define MUI_UNCONFIRMPAGE_TEXT_TOP "确定要完全移除 VaultGTA 吗？"

; Abort
!define MUI_ABORTWARNING_TEXT "确定要取消 VaultGTA 的安装吗？"
!define MUI_UNABORTWARNING_TEXT "确定要取消 VaultGTA 的卸载吗？"

; Branding
BrandingText "VaultGTA ${VERSION}"
