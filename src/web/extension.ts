// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {
	CancellationToken, CodeLens, CodeLensProvider, commands,
	env, EventEmitter, ExtensionContext, languages, Event,
	Position, Range, TextDocument, window, workspace
} from 'vscode';
import { isEncrypted, encrypt, decrypt } from './crypto-utils';

/**
 * CodelensProvider
 */
export class CodelensProvider implements CodeLensProvider {

	private codeLenses: CodeLens[] = [];
	private regex: RegExp;
	private _onDidChangeCodeLenses: EventEmitter<void> = new EventEmitter<void>();
	public readonly onDidChangeCodeLenses: Event<void> = this._onDidChangeCodeLenses.event;

	constructor() {
		this.regex = /[^\r\n:]+[:][^\r\n:]{3,}/g;

		workspace.onDidChangeConfiguration((_) => {
			this._onDidChangeCodeLenses.fire();
		});
	}

	public provideCodeLenses(document: TextDocument, token: CancellationToken): CodeLens[] | Thenable<CodeLens[]> {
		this.codeLenses = [];
		const regex = new RegExp(this.regex);
		const text = document.getText();
		for (var match of [...text.matchAll(regex)]) {
			try {
				if (typeof match.index === 'undefined') {
					continue;
				}
				const pos = document.positionAt(match.index);
				const range = new Range(pos, pos.translate(undefined, match[0].length));

				if (range) {
					let first = new CodeLens(range);
					(first as unknown as any).order = 1;
					let second = new CodeLens(range);
					(second as unknown as any).order = 2;

					this.codeLenses.push(first);
					this.codeLenses.push(second);
				}
			} catch (e) {
				window.showInformationMessage('Error' + e);
			}
		}
		return this.codeLenses;
	}

	public resolveCodeLens(codeLens: CodeLens | any, token: CancellationToken) {
		const text = window.activeTextEditor?.document.getText(codeLens.range);

		let password = text?.substring(text.indexOf(":") + 1);
		if (!password) {
			return;
		}
		switch (codeLens.order) {
			case 1:
				codeLens.command = {
					title: isEncrypted(password) ? "Unhide Password" : "Hide Password",
					command: "powder.toggle-password-encryption",
					arguments: [codeLens.range],
				};
				break;
			case 2:
				codeLens.command = {
					title: "Copy Password",
					command: "powder.copy-password",
					arguments: [codeLens.range],
				};
				break;
		}

		return codeLens;
	}
}

export async function activate(context: ExtensionContext) {
	let toClean = [];
	const codelensProvider = new CodelensProvider();

	toClean.push(languages.registerCodeLensProvider("*", codelensProvider));

	toClean.push(commands.registerCommand('powder.toggle-password-encryption', async (range) => {
		const text = window.activeTextEditor?.document.getText(range);

		if (!text) {
			return;
		}
		let password = text.substring(text.indexOf(":") + 1);
		if (!password) {
			return;
		}
		const masterPassword = await window.showInputBox({
			placeHolder: "Master password",
			prompt: "Powder: Provide your password to get another",
			value: ''
		});
		if (!masterPassword) {
			return;
		}
		if (isEncrypted(password)) {
			const decryptedPassword = await decrypt(password, masterPassword);
			if (!decryptedPassword) {
				return;
			}
			await window.activeTextEditor?.edit(editBuilder => {
				editBuilder.replace(range.with(new Position(range.start.line, text.indexOf(":") + 1)), decryptedPassword);
			});
		} else {
			const encryptedPassword = await encrypt(password, masterPassword);
			if (!encryptedPassword) {
				return;
			}
			await window.activeTextEditor?.edit(editBuilder => {
				editBuilder.replace(range.with(new Position(range.start.line, text.indexOf(":") + 1)), encryptedPassword);
			});
		}
	}));

	toClean.push(commands.registerCommand('powder.copy-password', async (range) => {
		const text = window.activeTextEditor?.document.getText(range);
		let password = text?.substring(text.indexOf(":") + 1) || null;
		if (!password) {
			return;
		}
		if (isEncrypted(password)) {
			const masterPassword = await window.showInputBox({
				placeHolder: "Master password",
				prompt: "Powder: Provide your password to get another",
				value: ''
			});
			if (!masterPassword) {
				return;
			}
			password = await decrypt(password, masterPassword);
			if (!password) {
				return;
			}
		}
		await env.clipboard.writeText(password);
		window.showInformationMessage('Password has been copied!');
	}));
}

export function deactivate() { }