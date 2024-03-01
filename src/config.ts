import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as process from 'child_process';
import { getCmd } from './cmd';

// Write the configuration file
export function writeConfig(context: vscode.ExtensionContext) {
  // Get the path to the config file
	const file = configFileLocation(context);

  // If the file path is not defined, log an error and return
	if (!file) {
		console.error(`cannot get extension storage uri path`);
		return;
	}

  if (writeConfigFile(file)) {
    console.debug(`Wrote config file to ${file}`);
  }
}

function writeConfigFile(file: string): boolean {

  let config = generateConfig();
	try {
    // Write the config file
		fs.writeFileSync(file, config, { encoding: "utf8" });
    console.error(`Wrote config file to ${file}`);
    (global as any).configFileLocation = file;
    return true;
	} catch (err) {
		console.error(`write config: ${err}`);
		vscode.window.showErrorMessage(`Write config file: ${err}`);
    return false;
	}
}

function generateConfig(): string {
  const tabSize = vscode.workspace.getConfiguration("", {
		languageId: `yaml`,
	}).get(`editor.tabSize`, 2);
  // Read the user's settings and write them to the config file
	let conf = vscode.workspace.getConfiguration();
  const formatterType = conf.get('kubernetes-yaml-formatter-x.formatterType', 'basic');
  const retainLineBreaks = conf.get('kubernetes-yaml-formatter-x.retainLineBreaks', false);
  const retainLineBreaksSingle = conf.get('kubernetes-yaml-formatter-x.retainLineBreaksSingle', false);
  const scanFoldedAsLiteral = conf.get('kubernetes-yaml-formatter-x.scanFoldedAsLiteral', false);
  const indentlessArrays = conf.get('kubernetes-yaml-formatter-x.indentlessArrays', false);
  const disallowAnchors = conf.get('kubernetes-yaml-formatter-x.disallowAnchors', false);
  const maxLineLength = conf.get('kubernetes-yaml-formatter-x.maxLineLength', 80);
  const dropMergeTag = conf.get('kubernetes-yaml-formatter-x.dropMergeTag', false);
  const padLineComments = conf.get('kubernetes-yaml-formatter-x.padLineComments', false);
	const includeDocumentStart = conf.get('kubernetes-yaml-formatter-x.includeDocumentStart', false);
  // Get the EOL character from the user's settings
	let eof = "~";
	switch (conf.get('files.eol')) {
		case "\n":
			eof = "lf";
			break;
		case "\r\n":
			eof = "crlf";
			break;
		default:
			eof = "~";
			break;
	}
  let config = `formatter:
  type: ${formatterType}
  indent: ${tabSize}
  line_ending: ${eof}
  retain_line_breaks: ${retainLineBreaks}
  retain_line_breaks_single: ${retainLineBreaksSingle}
  scan_folded_as_literal: ${scanFoldedAsLiteral}
  include_document_start: ${includeDocumentStart}
  indentless_arrays: ${indentlessArrays}
  disallow_anchors: ${disallowAnchors}
  max_line_length: ${maxLineLength}
  drop_merge_tag: ${dropMergeTag}
  pad_line_comments: ${padLineComments}

`;
  return config;
}

export function getConfigFileLocation(context: vscode.ExtensionContext): string | undefined {
  return configFileLocation(context);
}

// Get the path to the configuration file
function configFileLocation(context: vscode.ExtensionContext): string | undefined {
	let fsPath = context.storageUri?.fsPath;
  // If the path is not defined, use the system temp directory
	if (!fsPath) {
		try {
      // Create a temporary directory for the extension
			fsPath = path.join(os.tmpdir(), context.extension.id);
			if (!fs.existsSync(fsPath)) {
        // Create the directory if it doesn't exist
				fs.mkdirSync(fsPath);
			}
		} catch (err) {
			throw new Error(`create tmp dir: ${err}`);
		}
		// maybe we are in the dev/debug mode.
		console.log(`cannot get extension storage uri fs path, fallback ${fsPath}`);
	}
	try {
		fs.mkdirSync(fsPath, { recursive: true });
	} catch (err) {
		console.error(`mkdir ${fsPath}: ${err}`);
		vscode.window.showErrorMessage(`mkdir extension storage uri path ${fsPath}: ${err}`);
	}
  // Return the path to the config file
	return path.join(fsPath, "config.yaml");
}

function getWorkspaceConfig(uri: vscode.Uri): string | undefined {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
  if (!workspaceFolder) {
    console.info(`No workspace folder for ${uri}`);
    return;
  }
  // search for the config file in the workspace
  let cmd = getCmd();
  const sp = process.spawnSync(cmd, ['-debug', 'config', '-quiet'], {
    cwd: workspaceFolder.uri.fsPath
  });
  if (sp.error) {
    console.error(`workspace config: ${sp.error}`);
    return;
  }
  for (let line of sp.stdout.toString().split('\n')) {
    if (line.includes('Found config at')) {
      let file = line.substring(25);
      console.debug(`workspace config file: ${file}`);
      return file;
    }
  }
  console.log(`No workspace config found`);
  return;
}

function getGlobalConfig(context: vscode.ExtensionContext): string | undefined{
  let cmd = getCmd();
  const sp = process.spawnSync(cmd, ['-global_conf', '-debug', 'config']);
  if (sp.error) {
    console.error(`global config: ${sp.error}`);
    return;
  }
  for (let line of sp.stdout.toString().split('\n')) {
    if (line.includes('Found config at')) {
      let file = line.substring(25);
      console.debug(`global config file: ${file}`);
      return file;
    }
  }
  console.log(`No global config found`);
  return;
}

export function getConfigOption(option: string, context?: vscode.ExtensionContext, document?: vscode.TextDocument): string | undefined {
  let conf = vscode.workspace.getConfiguration();
  if (option === "workspace") {
    if (document) {
      return conf.get('kubernetes-yaml-formatter-x.config.useWorkspaceConfig') ? getWorkspaceConfig(document.uri) : undefined;
    }
  }
  if (option === "global") {
    if (context) {
      return conf.get('kubernetes-yaml-formatter-x.config.useGlobalConfig') ? getGlobalConfig(context) : undefined;
    }
  }
  return;
}

export function getConfigBool(option: string): boolean | undefined {
  let conf = vscode.workspace.getConfiguration();
  return conf.get(`kubernetes-yaml-formatter-x.config.${option}`);
}

export function removeConfig(context: vscode.ExtensionContext) {
  // Remove the config file when the extension is deactivated
  let file = (global as any).configFileLocation;
  if (file) {
    try {
      fs.unlinkSync(file);
    } catch (err) {
      console.error(`unlink ${file}: ${err}`);
    }
  } else {
    console.error(`Cannot get extension storage uri path`);
  }
}
