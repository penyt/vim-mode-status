import { App, PluginSettingTab, Setting } from "obsidian";
import VimModeStatusPlugin from "./main";

export interface VimModeStatusSettings {
	normalColor: string;
	insertColor: string;
	visualColor: string;
	replaceColor: string;
	commandColor: string;
	displayFormat: "full" | "short";
}

export const DEFAULT_SETTINGS: VimModeStatusSettings = {
	normalColor: "#82aaff",
	insertColor: "#c3e88d",
	visualColor: "#ffcb6b",
	replaceColor: "#993142",
	commandColor: "#89ddff",
	displayFormat: "full",
};

export class VimModeStatusSettingTab extends PluginSettingTab {
	plugin: VimModeStatusPlugin;

	constructor(app: App, plugin: VimModeStatusPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Display format")
			.setDesc(
				"Choose between full text (e.g. NORMAL) or abbreviation (e.g. N)",
			)
			.addDropdown((dropdown) =>
				dropdown
					.addOption("full", "Full (NORMAL)")
					.addOption("short", "Short (N)")
					.setValue(this.plugin.settings.displayFormat)
					.onChange(async (value) => {
						this.plugin.settings.displayFormat = value as
							| "full"
							| "short";
						await this.plugin.saveSettings();
						this.plugin.refreshMode();
					}),
			);

		new Setting(containerEl).setName("Mode colors").setHeading();

		new Setting(containerEl)
			.setName("Normal mode color")
			.setDesc("Background color for Normal mode")
			.addColorPicker((color) =>
				color
					.setValue(this.plugin.settings.normalColor)
					.onChange(async (value) => {
						this.plugin.settings.normalColor = value;
						await this.plugin.saveSettings();
						this.plugin.refreshMode();
					}),
			);

		new Setting(containerEl)
			.setName("Insert mode color")
			.setDesc("Background color for Insert mode")
			.addColorPicker((color) =>
				color
					.setValue(this.plugin.settings.insertColor)
					.onChange(async (value) => {
						this.plugin.settings.insertColor = value;
						await this.plugin.saveSettings();
						this.plugin.refreshMode();
					}),
			);

		new Setting(containerEl)
			.setName("Visual mode color")
			.setDesc("Background color for Visual mode")
			.addColorPicker((color) =>
				color
					.setValue(this.plugin.settings.visualColor)
					.onChange(async (value) => {
						this.plugin.settings.visualColor = value;
						await this.plugin.saveSettings();
						this.plugin.refreshMode();
					}),
			);

		new Setting(containerEl)
			.setName("Replace mode color")
			.setDesc("Background color for Replace mode")
			.addColorPicker((color) =>
				color
					.setValue(this.plugin.settings.replaceColor)
					.onChange(async (value) => {
						this.plugin.settings.replaceColor = value;
						await this.plugin.saveSettings();
						this.plugin.refreshMode();
					}),
			);

		new Setting(containerEl)
			.setName("Command mode color")
			.setDesc("Background color for Command mode")
			.addColorPicker((color) =>
				color
					.setValue(this.plugin.settings.commandColor)
					.onChange(async (value) => {
						this.plugin.settings.commandColor = value;
						await this.plugin.saveSettings();
						this.plugin.refreshMode();
					}),
			);

		new Setting(containerEl).setName("Reset").setHeading();

		new Setting(containerEl)
			.setName("Reset colors to default")
			.setDesc("Restore all mode colors to their default values.")
			.addButton((button) =>
				button.setButtonText("Reset colors").onClick(async () => {
					this.plugin.settings.normalColor =
						DEFAULT_SETTINGS.normalColor;
					this.plugin.settings.insertColor =
						DEFAULT_SETTINGS.insertColor;
					this.plugin.settings.visualColor =
						DEFAULT_SETTINGS.visualColor;
					this.plugin.settings.replaceColor =
						DEFAULT_SETTINGS.replaceColor;
					this.plugin.settings.commandColor =
						DEFAULT_SETTINGS.commandColor;
					await this.plugin.saveSettings();
					this.plugin.refreshMode();
					this.display(); // Re-render the settings page to show new values
				}),
			);
	}
}
