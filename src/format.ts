import * as vscode from 'vscode';
import { getConfigBool, getConfigOption, getConfigFileLocation } from './config';
import { getCmd } from './cmd';
import * as process from 'child_process';
import { platform } from 'node:process';
import { get } from 'http';

export function getFileEdit(context: vscode.ExtensionContext, document: vscode.TextDocument): vscode.TextEdit[] {
  console.debug(`formatting ${document.fileName}`);

  const txt = document.getText();

  let args = getArgs(document, context);

  let cmd = getCmd();
  console.debug(`using cmd: ${cmd}`);
  console.debug(`using args: ${args}`);
  // Run the formatter and return the result
  const sp = process.spawnSync(cmd, args, {
    input: txt,
  });

  // If the formatter fails, log the error and return an empty array
  if (sp.status !== 0) {
    console.error(`format ${txt} fail: ${sp.stderr.toString()}`);
    return [];
  }

  if (sp.stderr.toString() !== '') {
    console.error(`format ${txt} stderr: ${sp.stderr.toString()}`);
    return [];
  }

  if (sp.stdout.toString() === '') {
    console.log(`yamlfmt's stdout buffer is empty`);
    return [];
  }

  // Paste the formatted text into the document
  const edits = vscode.TextEdit.replace(
    new vscode.Range(
      new vscode.Position(0, 0),
      new vscode.Position(document.lineCount, document.lineAt(document.lineCount - 1).text.length)
    ), sp.stdout.toString(),
  );
  return [edits];
}

function getArgs(document: vscode.TextDocument, context: vscode.ExtensionContext): string[] {
  let args = [`-in`];
  // Check if the user has opted to use the local config
  var localConfig = getConfigOption("workspace", context, document);
  var globalConfig = getConfigOption("global", context);
  let useGlobalConfigOverWorkspace = getConfigBool("useGlobalConfigOverWorkspace");
  if (useGlobalConfigOverWorkspace && globalConfig) {
    console.debug(useGlobalConfigOverWorkspace);
    console.debug(`Global config is preferred over workspace config`);
    console.debug(`Using global config file: ${globalConfig}`);
    args.push(`-global_conf`);
  } else if (localConfig) {
    console.debug(`using local config: ${localConfig}`);
    args.push(`-conf`);
    args.push(localConfig);
  } else if (globalConfig) {
    console.debug(`Using global config file: ${globalConfig}`);
    args.push(`-global_conf`);
  } else {
    console.debug(`Using extension config`);
    const confFile = getConfigFileLocation(context);
    if (confFile) {
      args.push(`-conf`);
      args.push(confFile);
    }
    console.debug(`using local config: ${confFile}`);
  }
  return args;
}
