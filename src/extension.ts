import * as vscode from 'vscode';
import { writeConfig, removeConfig } from './config';
import { getFileEdit } from './format';

export function activate(context: vscode.ExtensionContext) {

	// Set context as a global as some tests depend on it
  (global as any).testExtensionContext = context;

	console.log(`Kubernetes Yaml Formatter X is now active!`);

  // Write the config file when the extension is activated
	writeConfig(context);

  // Watch for changes to the configuration file
	vscode.workspace.onDidChangeConfiguration(ev => {
      if (ev.affectsConfiguration('kubernetes-yaml-formatter-x')) {
        console.log(`rewrite config file since something changed just now`);
        writeConfig(context);
        return;
      }
	});

  console.debug(`registered onDidChangeConfiguration`);

	vscode.languages.registerDocumentFormattingEditProvider('yaml', {
		provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
      return getFileEdit(context, document);
		}
	});
  vscode.languages.registerDocumentFormattingEditProvider('ansible', {
		provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
      return getFileEdit(context, document);
		}
	});
}

// this method is called when your extension is deactivated
export function deactivate(context: vscode.ExtensionContext) {
  removeConfig(context);
}
