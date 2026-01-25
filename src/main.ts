import { Plugin, MarkdownView, WorkspaceLeaf } from "obsidian";
import {
	VimModeStatusSettings,
	DEFAULT_SETTINGS,
	VimModeStatusSettingTab,
} from "./settings";

// Add REPLACE
type VimMode = "OFF" | "NORMAL" | "INSERT" | "VISUAL" | "REPLACE" | "COMMAND";

export default class VimModeStatusPlugin extends Plugin {
	settings: VimModeStatusSettings;
	private statusEl!: HTMLElement;
	private currentCm: any = null;
	private currentView: MarkdownView | null = null;
	private detachFns: Array<() => void> = [];
	private hasSeenVimState = false;

	async onload() {
		await this.loadSettings();

		this.statusEl = this.addStatusBarItem();
		this.statusEl.addClass("vim-mode-statusbar");
		this.updateStatusColors();
		this.setMode("OFF");

		this.addSettingTab(new VimModeStatusSettingTab(this.app, this));

		this.registerEvent(
			this.app.workspace.on("active-leaf-change", (leaf) => {
				this.attachToLeaf(leaf);
			}),
		);

		this.registerEvent(
			this.app.workspace.on("layout-change", () => {
				const leaf =
					this.app.workspace.getActiveViewOfType(MarkdownView)?.leaf;
				if (leaf) {
					this.attachToLeaf(leaf);
				}
			}),
		);

		this.attachToLeaf(this.app.workspace.getMostRecentLeaf() ?? null);
	}

	onunload() {
		this.clearAttach();
	}

	private clearAttach() {
		for (const fn of this.detachFns) {
			try {
				fn();
			} catch {}
		}
		this.detachFns = [];
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.updateStatusColors();
	}

	private attachToLeaf(leaf: WorkspaceLeaf | null) {
		this.clearAttach();
		this.hasSeenVimState = false;

		this.currentCm = null;
		this.currentView = null;

		const view = leaf?.view;
		if (!(view instanceof MarkdownView)) {
			this.setMode("OFF");
			return;
		}

		if (view.getMode() === "preview") {
			this.setMode("OFF");
			return;
		}

		this.currentView = view;
		const editorAny: any =
			(view as any).editor ?? (view as any).sourceMode?.cmEditor;
		const cm =
			editorAny?.cm ??
			editorAny?.cm?.cm ??
			editorAny?.cm6 ??
			editorAny?.editorView ??
			null;

		this.currentCm = cm;
		this.refreshMode();

		// Attempt to attach event (backward compatibility)
		if (cm?.on && typeof cm.on === "function") {
			const onVimModeChange = (e: any) => {
				const mode = this.normalizeMode(e?.mode);
				this.setMode(mode);
			};
			cm.on("vim-mode-change", onVimModeChange);
			this.detachFns.push(() => {
				try {
					cm.off?.("vim-mode-change", onVimModeChange);
				} catch {}
			});
		}

		// DOM event fallback
		const container =
			(view.contentEl.querySelector(".cm-editor") as HTMLElement) ??
			(view.contentEl.querySelector(".cm-content") as HTMLElement) ??
			view.contentEl;

		const handler = () => this.refreshMode();

		container.addEventListener("keydown", handler);
		container.addEventListener("keyup", handler);
		container.addEventListener("mouseup", handler);
		container.addEventListener("click", handler);

		this.detachFns.push(() => {
			container.removeEventListener("keydown", handler);
			container.removeEventListener("keyup", handler);
			container.removeEventListener("mouseup", handler);
			container.removeEventListener("click", handler);
		});
	}

	public refreshMode() {
		const mode = this.detectMode(this.currentCm);
		this.setMode(mode);
	}

	private detectMode(cm: any): VimMode {
		if (!cm) return "OFF";

		// Priority check for Command Input (Obsidian's Vim Command bar)
		if (this.currentView) {
			const vimPanel =
				this.currentView.contentEl.querySelector(".cm-vim-panel");
			if (vimPanel) {
				const input = vimPanel.querySelector(
					"input",
				) as HTMLInputElement | null;
				if (input && document.activeElement === input) {
					return "COMMAND";
				}
			}
		}

		const vimState = cm?.state?.vim ?? cm?.cm?.state?.vim;
		if (!vimState) {
			// If vim state object is not found, treat as OFF
			return this.hasSeenVimState ? "NORMAL" : "OFF";
		}

		this.hasSeenVimState = true;
		return this.detectFromVimState(vimState);
	}

	private detectFromVimState(vimState: any): VimMode {
		if (vimState.replace) return "REPLACE"; // Flag for some versions

		if (typeof vimState?.mode === "string") {
			return this.normalizeMode(vimState.mode);
		}

		if (vimState?.insertMode) return "INSERT";
		if (vimState?.visualMode) return "VISUAL";

		return "NORMAL";
	}

	private normalizeMode(m: any): VimMode {
		const s = String(m ?? "").toUpperCase();
		if (s.includes("INSERT")) return "INSERT";
		if (s.includes("VISUAL")) return "VISUAL";
		if (s.includes("REPLACE")) return "REPLACE";
		if (s.includes("CMD") || s.includes("COMMAND")) return "COMMAND";
		if (s.includes("NORMAL")) return "NORMAL";
		return "NORMAL"; // Fallback to Normal instead of OFF if we have a signal
	}

	private setMode(mode: VimMode) {
		if (mode === "OFF") {
			this.statusEl.hide();
			return;
		}
		this.statusEl.show();

		let displayText: string = mode;
		if (this.settings.displayFormat === "short") {
			this.statusEl.addClass("is-short");
			switch (mode) {
				case "NORMAL":
					displayText = "N";
					break;
				case "INSERT":
					displayText = "I";
					break;
				case "VISUAL":
					displayText = "V";
					break;
				case "REPLACE":
					displayText = "R";
					break;
				case "COMMAND":
					displayText = "C";
					break;
			}
		} else {
			this.statusEl.removeClass("is-short");
		}

		this.statusEl.setText(displayText);

		// Remove all potential status classes
		this.statusEl.removeClass(
			"is-off",
			"is-normal",
			"is-insert",
			"is-visual",
			"is-replace",
			"is-command",
		);

		// Add corresponding class
		switch (mode) {
			case "NORMAL":
				this.statusEl.addClass("is-normal");
				break;
			case "INSERT":
				this.statusEl.addClass("is-insert");
				break;
			case "VISUAL":
				this.statusEl.addClass("is-visual");
				break;
			case "REPLACE":
				this.statusEl.addClass("is-replace");
				break;
			case "COMMAND":
				this.statusEl.addClass("is-command");
				break;
		}
	}

	public updateStatusColors() {
		if (!this.statusEl) return;

		this.statusEl.style.setProperty(
			"--vim-mode-color-normal",
			this.settings.normalColor,
		);
		this.statusEl.style.setProperty(
			"--vim-mode-color-insert",
			this.settings.insertColor,
		);
		this.statusEl.style.setProperty(
			"--vim-mode-color-visual",
			this.settings.visualColor,
		);
		this.statusEl.style.setProperty(
			"--vim-mode-color-replace",
			this.settings.replaceColor,
		);
		this.statusEl.style.setProperty(
			"--vim-mode-color-command",
			this.settings.commandColor,
		);
	}
}
