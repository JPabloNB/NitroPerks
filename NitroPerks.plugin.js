/**
 * @name NitroPerks
 * @website https://github.com/JPabloNB/NitroPerks
 * @source https://raw.githubusercontent.com/JPabloNB/NitroPerks/main/NitroPerks.plugin.js
 * @updateUrl https://raw.githubusercontent.com/JPabloNB/NitroPerks/main/NitroPerks.plugin.js
 */
/*@cc_on
@if (@_jscript)
	
	// Offer to self-install for clueless users that try to run this directly.
	var shell = WScript.CreateObject("WScript.Shell");
	var fs = new ActiveXObject("Scripting.FileSystemObject");
	var pathPlugins = shell.ExpandEnvironmentStrings("%APPDATA%\BetterDiscord\plugins");
	var pathSelf = WScript.ScriptFullName;
	// Put the user at ease by addressing them in the first person
	shell.Popup("It looks like you've mistakenly tried to run me directly. \n(Don't do that!)", 0, "I'm a plugin for BetterDiscord", 0x30);
	if (fs.GetParentFolderName(pathSelf) === fs.GetAbsolutePathName(pathPlugins)) {
		shell.Popup("I'm in the correct folder already.", 0, "I'm already installed", 0x40);
	} else if (!fs.FolderExists(pathPlugins)) {
		shell.Popup("I can't find the BetterDiscord plugins folder.\nAre you sure it's even installed?", 0, "Can't install myself", 0x10);
	} else if (shell.Popup("Should I copy myself to BetterDiscord's plugins folder for you?", 0, "Do you need some help?", 0x34) === 6) {
		fs.CopyFile(pathSelf, fs.BuildPath(pathPlugins, fs.GetFileName(pathSelf)), true);
		// Show the user where to put plugins in the future
		shell.Exec("explorer " + pathPlugins);
		shell.Popup("I'm installed!", 0, "Successfully installed", 0x40);
	}
	WScript.Quit();

@else@*/
module.exports = (() => {
    const config = {
        "info": {
            "name": "NitroPerks",
            "authors": [
                {
                    "name": "lemons",
                    "discord_id": "407348579376693260",
                    "github_username": "respecting"
                },
                {
                    "name": "Shimoro",
                    "discord_id": "427406422733619200",
                    "github_username": "Shimoro-Rune"
                },
			    {
                    "name": "JPabloNB",
                    "discord_id": "270700802488795136",
                    "github_username": "JPabloNB"
                }
            ],
            "version": "1.3.9",
            "description": "Set clientsided animated avatar and profile banner, share your screen at 60fps 1080P and use cross-server and animated emojis everywhere! You still won't be able to upload 100MB files though :<",
            "github": "https://github.com/JPabloNB/NitroPerks",
            "github_raw": "https://raw.githubusercontent.com/JPabloNB/NitroPerks/main/NitroPerks.plugin.js"
        },
		"changelog": [
			{
				"title": "Fixed profile avatar",
				"type": "fixed",
                "items": ["Fixed profile avatar didn't show up"]
			},
			{
				"title": "Fixed profile banner",
				"type": "fixed",
                "items": ["Fixed profile banner didn't show up"]
			},
		],
        "main": "NitroPerks.plugin.js"
    };

    return !global.ZeresPluginLibrary ? class {
        constructor() {
            this._config = config;
        }
        getName() {
            return config.info.name;
        }
        getAuthor() {
            return config.info.authors.map(a => a.name).join(", ");
        }
        getDescription() {
            return config.info.description;
        }
        getVersion() {
            return config.info.version;
        }
		getChangelog() {
			return config.changelog;
		}
        load() {
            BdApi.showConfirmationModal("Library Missing", `The library plugin needed for ${config.info.name} is missing. Please click Download Now to install it.`, {
                confirmText: "Download Now",
                cancelText: "Cancel",
                onConfirm: () => {
                    require("request").get("https://rauenzi.github.io/BDPluginLibrary/release/0PluginLibrary.plugin.js", async (error, response, body) => {
                        if (error) return require("electron").shell.openExternal("https://betterdiscord.net/ghdl?url=https://raw.githubusercontent.com/rauenzi/BDPluginLibrary/master/release/0PluginLibrary.plugin.js");
                        await new Promise(r => require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0PluginLibrary.plugin.js"), body, r));
                    });
                }
            });
        }
        start() {}
        stop() {}
    } : (([Plugin, Api]) => {
        const plugin = (Plugin, Api) => {
            const {
                Patcher,
                DiscordModules,
                Settings,
                Toasts,
                Utilities
            } = Api;
            return class NitroPerks extends Plugin {
                defaultSettings = {
                    "emojiSize": "40",
                    "screenSharing": true,
                    "emojiBypass": true,
                    "clientsidePfp": false,
                    "clientsideBanner": false,
                    "pfpUrl": "",
                    "bannerUrl": "",
                };
                settings = Utilities.loadSettings(this.getName(), this.defaultSettings);
                originalNitroStatus = 0;
                clientsidePfp;
                screenShareFix;
                getSettingsPanel() {
                    return Settings.SettingPanel.build(_ => this.saveAndUpdate(), ...[
                        new Settings.SettingGroup("Features").append(...[
                            new Settings.Switch("High Quality Screensharing", "Enable or disable 1080p/source @ 60fps screensharing. This adapts to your current nitro status.", this.settings.screenSharing, value => this.settings.screenSharing = value)
                        ]),
                        new Settings.SettingGroup("Emojis").append(
                            new Settings.Switch("Nitro Emojis Bypass", "Enable or disable using the Nitro Emoji bypass.", this.settings.emojiBypass, value => this.settings.emojiBypass = value),
                            new Settings.Slider("Size", "The size of the emoji in pixels. 40 is recommended.", 16, 64, this.settings.emojiSize, size=>this.settings.emojiSize = size, {markers:[16,20,32,40,64], stickToMarkers:true})
                        ),
						new Settings.SettingGroup("Profile Avatar").append(...[
							new Settings.Switch("Clientsided Profile Avatar", "Enable or disable clientsided profile avatar.", this.settings.clientsidePfp, value => this.settings.clientsidePfp = value),
							new Settings.Textbox("URL", "The direct URL to the profile avatar you want (PNG, JPG or GIF; square image is recommended).", this.settings.pfpUrl,
								image => {
									try {
										new URL(image)
									} catch {
										return Toasts.error('This is an invalid URL!')
									}
									this.settings.pfpUrl = image
								}
							)
						]),
						new Settings.SettingGroup("Profile Banner").append(...[
                                new Settings.Switch("Clientsided Profile Banner", "Enable or disable clientsided profile banner.", this.settings.clientsideBanner, value => this.settings.clientsideBanner = value),
                                new Settings.Textbox("URL", "The direct URL to the profile banner you want (PNG, JPG or GIF; 600x240 size is recommended).", this.settings.bannerUrl,
                                    image => {
                                        try {
                                            new URL(image)
                                        } catch {
                                            return Toasts.error('This is an invalid URL!')
                                        }
                                        this.settings.bannerUrl = image
                                    }
                                )
                            ])
                    ])
                }
                
                saveAndUpdate() {
                    Utilities.saveSettings(this.getName(), this.settings)
                    if (!this.settings.screenSharing) {
                        switch (this.originalNitroStatus) {
                            case 1:
                                BdApi.injectCSS("screenShare", `#app-mount > div.layerContainer-yqaFcK > div.layer-2KE1M9 > div > div > form > div:nth-child(2) > div > div > div.flex-1xMQg5.flex-1O1GKY.horizontal-1ae9ci.horizontal-2EEEnY.flex-1O1GKY.directionRow-3v3tfG.justifyStart-2NDFzi.alignStretch-DpGPf3.noWrap-3jynv6.modalContent-BM7Qeh > div:nth-child(1) > div > button:nth-child(4) {
                                    display: none;
                                  }`)
                                this.screenShareFix = setInterval(()=>{
                                    document.querySelector("#app-mount > div.layerContainer-yqaFcK > div.layer-2KE1M9 > div > div > form > div:nth-child(2) > div > div > div.flex-1xMQg5.flex-1O1GKY.horizontal-1ae9ci.horizontal-2EEEnY.flex-1O1GKY.directionRow-3v3tfG.justifyStart-2NDFzi.alignStretch-DpGPf3.noWrap-3jynv6.modalContent-BM7Qeh > div:nth-child(1) > div > button:nth-child(3)").click()
                                    clearInterval(this.screenShareFix)
                                }, 100)
                                break;
                            default: //if user doesn't have nitro?
                                BdApi.injectCSS("screenShare", `#app-mount > div.layerContainer-yqaFcK > div.layer-2KE1M9 > div > div > form > div:nth-child(2) > div > div > div.flex-1xMQg5.flex-1O1GKY.horizontal-1ae9ci.horizontal-2EEEnY.flex-1O1GKY.directionRow-3v3tfG.justifyStart-2NDFzi.alignStretch-DpGPf3.noWrap-3jynv6.modalContent-BM7Qeh > div:nth-child(1) > div > button:nth-child(4) {
                                    display: none;
                                  }
                                  #app-mount > div.layerContainer-yqaFcK > div.layer-2KE1M9 > div > div > form > div:nth-child(2) > div > div > div.flex-1xMQg5.flex-1O1GKY.horizontal-1ae9ci.horizontal-2EEEnY.flex-1O1GKY.directionRow-3v3tfG.justifyStart-2NDFzi.alignStretch-DpGPf3.noWrap-3jynv6.modalContent-BM7Qeh > div:nth-child(1) > div > button:nth-child(3) {
                                    display: none;
                                  }
                                  #app-mount > div.layerContainer-yqaFcK > div.layer-2KE1M9 > div > div > form > div:nth-child(2) > div > div > div.flex-1xMQg5.flex-1O1GKY.horizontal-1ae9ci.horizontal-2EEEnY.flex-1O1GKY.directionRow-3v3tfG.justifyStart-2NDFzi.alignStretch-DpGPf3.noWrap-3jynv6.modalContent-BM7Qeh > div:nth-child(2) > div > button:nth-child(3) {
                                    display: none;
                                  }`)
                                this.screenShareFix = setInterval(()=>{
                                    document.querySelector("#app-mount > div.layerContainer-yqaFcK > div.layer-2KE1M9 > div > div > form > div:nth-child(2) > div > div > div.flex-1xMQg5.flex-1O1GKY.horizontal-1ae9ci.horizontal-2EEEnY.flex-1O1GKY.directionRow-3v3tfG.justifyStart-2NDFzi.alignStretch-DpGPf3.noWrap-3jynv6.modalContent-BM7Qeh > div:nth-child(1) > div > button:nth-child(2)").click()
                                    document.querySelector("#app-mount > div.layerContainer-yqaFcK > div.layer-2KE1M9 > div > div > form > div:nth-child(2) > div > div > div.flex-1xMQg5.flex-1O1GKY.horizontal-1ae9ci.horizontal-2EEEnY.flex-1O1GKY.directionRow-3v3tfG.justifyStart-2NDFzi.alignStretch-DpGPf3.noWrap-3jynv6.modalContent-BM7Qeh > div:nth-child(2) > div > button:nth-child(2)").click()
                                    clearInterval(this.screenShareFix)
                                }, 100)
                            break;
                        }
                    }

                    if (this.settings.screenSharing) BdApi.clearCSS("screenShare")

                    if (this.settings.emojiBypass) {
                        //fix emotes with bad method
                        Patcher.before(DiscordModules.MessageActions, "sendMessage", (_, [, msg]) => {
                            msg.validNonShortcutEmojis.forEach(emoji => {
                                if (emoji.url.startsWith("/assets/")) return;
                                msg.content = msg.content.replace(`<${emoji.animated ? "a" : ""}${emoji.allNamesString.replace(/~\d/g, "")}${emoji.id}>`, emoji.url + `&size=${this.settings.emojiSize} `)
                            })
                        });
                        //for editing message also
                        Patcher.before(DiscordModules.MessageActions, "editMessage", (_,obj) => {
                            let msg = obj[2].content
                            if (msg.search(/\d{18}/g) == -1) return;
                            msg.match(/<a:.+?:\d{18}>|<:.+?:\d{18}>/g).forEach(idfkAnymore=>{
                                obj[2].content = obj[2].content.replace(idfkAnymore, `https://cdn.discordapp.com/emojis/${idfkAnymore.match(/\d{18}/g)[0]}?size=${this.settings.emojiSize}`)
                            })
                        });
                    }

                    if(!this.settings.emojiBypass) Patcher.unpatchAll(DiscordModules.MessageActions)

                    if (this.settings.clientsidePfp && this.settings.pfpUrl) {
                        this.clientsidePfp = setInterval(()=>{
                            document.querySelectorAll(`[src="https://cdn.discordapp.com/avatars/${DiscordModules.UserStore.getCurrentUser().id}/${DiscordModules.UserStore.getCurrentUser().avatar}.webp?size=32"]`).forEach(avatar => {
                                avatar.src = this.settings.pfpUrl
                            });
                            document.querySelectorAll(`[src="https://cdn.discordapp.com/avatars/${DiscordModules.UserStore.getCurrentUser().id}/${DiscordModules.UserStore.getCurrentUser().avatar}.webp?size=80"]`).forEach(avatar => {
                                avatar.src = this.settings.pfpUrl
                            });
                            document.querySelectorAll(`[src="https://cdn.discordapp.com/avatars/${DiscordModules.UserStore.getCurrentUser().id}/${DiscordModules.UserStore.getCurrentUser().avatar}.webp?size=128"]`).forEach(avatar => {
                                avatar.src = this.settings.pfpUrl
                            });
                            document.querySelectorAll(`[class*="avatarContainer-"][class*="avatar-"][class*="avatarSmall-"]`).forEach(avatar => {
                                if (!avatar.style.backgroundImage.includes("https://cdn.discordapp.com/avatars/" + DiscordModules.UserStore.getCurrentUser().id + "/" + DiscordModules.UserStore.getCurrentUser().avatar)) return;
                                avatar.style = `background-image: url("${this.settings.pfpUrl}");`
                            });
                        }, 100);
                    }
                    if (!this.settings.clientsidePfp) this.removeClientsidePfp();
						
					if (this.settings.clientsideBanner && this.settings.bannerUrl) {
                        DiscordModules.UserStore.getCurrentUser().banner = this.settings.bannerUrl;
                        this.clientsideBanner = setInterval(()=>{
                            document.querySelectorAll(`[class*="bannerPremium-"]`).forEach(banner => {
                                if(!banner.style.backgroundImage.includes(`https://cdn.discordapp.com/banners/${DiscordModules.UserStore.getCurrentUser().id}/`)) return;
                                banner.style.backgroundImage = `url("${this.settings.bannerUrl}")`;
                            });
                        }, 100);
                    }
                    if (!this.settings.clientsideBanner) this.removeClientsideBanner()
                }
                removeClientsidePfp() {
                    clearInterval(this.clientsidePfp);
                    document.querySelectorAll(`[src="${this.settings.pfpUrl}"]`).forEach(avatar => {
                        avatar.src = DiscordModules.UserStore.getCurrentUser().getAvatarURL();
                    });
                    document.querySelectorAll(`[class*="avatarContainer-"][class*="avatar-"][class*="avatarSmall-"]`).forEach(avatar => {
                        if (!avatar.style.backgroundImage.includes(this.settings.pfpUrl)) return;
                        avatar.style.backgroundImage = `url("https://cdn.discordapp.com/avatars/${DiscordModules.UserStore.getCurrentUser().id}/${DiscordModules.UserStore.getCurrentUser().avatar}.webp?size=24"`;
                    });
                }
				removeClientsideBanner() {
                    DiscordModules.UserStore.getCurrentUser().banner = null;
                }
                onStart() {
                    this.originalNitroStatus = DiscordModules.UserStore.getCurrentUser().premiumType;
                    this.saveAndUpdate();
                    DiscordModules.UserStore.getCurrentUser().premiumType = 2;
                }

                onStop() {
                    DiscordModules.UserStore.getCurrentUser().premiumType = this.originalNitroStatus;
                    this.removeClientsidePfp();
					this.removeClientsideBanner();
                    Patcher.unpatchAll();
                }
            };
        };
        return plugin(Plugin, Api);
    })(global.ZeresPluginLibrary.buildPlugin(config));
})();
/*@end@*/